from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from decimal import Decimal
from backend.app.core.operacion import pedido_asignado
import io
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles, obtener_usuario_actual
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio, ErrorAccesoDenegado
from backend.app.core.almacenamiento import guardar_archivo
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.tiempo import ahora
from backend.app.core.config import settings
from backend.app.models import (
    Cobro, ComprobantePago, ObservacionCobro, AccesoComprobante,
    Pedido, Cliente, Usuario
)

router = APIRouter(prefix="/cobros", tags=["Cobranzas y Tesorería"])

class RegistrarCobroRequest(BaseModel):
    model_config = {"str_strip_whitespace": True}
    pedido_id: str
    importe: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    medio_pago: Literal["EFECTIVO","YAPE","PLIN","TRANSFERENCIA","DEPOSITO"]
    numero_operacion: Optional[str] = Field(default=None,max_length=100)

class ContrasteRequest(BaseModel):
    model_config = {"str_strip_whitespace": True}
    resultado: Literal["CONFORME","OBSERVADO"]
    movimiento_bancario: str = Field(min_length=3,max_length=200)
    observacion: Optional[str] = Field(default=None,max_length=1000)

@router.post("", status_code=status.HTTP_201_CREATED)
async def registrar_cobro(
    req: RegistrarCobroRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["REPARTIDOR"]))
):
    """
    Registra cobro realizado por el repartidor (RF-COB-01).
    El pedido debe estar en estado ENTREGADO.
    """
    pedido = await db.get(Pedido, req.pedido_id)
    if not pedido:
        raise ErrorNoEncontrado("Pedido", req.pedido_id)

    parada=await pedido_asignado(db,pedido.id_pedido,usuario)
    if pedido.estado!="ENTREGADO" or parada.estado!="ATENDIDA":raise HTTPException(409,"Registra primero la entrega y su evidencia")
    # Validar número de operación si no es efectivo
    if req.medio_pago.upper() != "EFECTIVO" and not req.numero_operacion:
        raise ErrorReglaNegocio("NUM_OPERACION_REQUERIDO", "El número de operación es obligatorio para pagos digitales.")

    # Validar duplicidad de operación
    if req.numero_operacion:
        op_existente = await db.execute(
            select(Cobro).where(
                Cobro.numero_operacion == req.numero_operacion,
                Cobro.medio_pago == req.medio_pago.upper()
            )
        )
        if op_existente.scalars().first():
            raise ErrorReglaNegocio("OPERACION_DUPLICADA", f"El número de operación {req.numero_operacion} ya fue registrado.")

    cobro = Cobro(
        pedido_id=pedido.id,
        parada_id=parada.id_parada,
        importe=req.importe,
        monto_esperado=pedido.importe,
        medio_pago=req.medio_pago.upper(),
        numero_operacion=req.numero_operacion,
        estado="PENDIENTE_CONTRASTE",
        registrado_por=usuario["sub"]
    )
    db.add(cobro)
    await db.flush()

    await registrar_auditoria(
        db=db,
        accion="REGISTRAR_COBRO",
        entidad="cobro",
        entidad_id=cobro.id,
        valores_despues={"importe": float(cobro.importe), "medio_pago": cobro.medio_pago},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {"mensaje": "Cobro registrado exitosamente", "cobro_id": cobro.id}

@router.post("/{id}/comprobante", status_code=status.HTTP_201_CREATED)
async def subir_comprobante_pago(
    id: str,
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["REPARTIDOR"]))
):
    """
    Sube comprobante de pago versionado (RF-COB-02 / RF-COB-06).
    Si ya existía uno previo, se desmarca como vigente y se crea una nueva versión.
    """
    cobro = await db.get(Cobro, id)
    if not cobro:
        raise ErrorNoEncontrado("Cobro", id)

    if int(cobro.registrado_por or 0)!=int(usuario['sub']):raise HTTPException(403,"Este cobro pertenece a otro repartidor")
    await pedido_asignado(db,cobro.pedido_id,usuario)
    if cobro.estado!="PENDIENTE_CONTRASTE":raise HTTPException(409,"Solo se permite adjuntar el comprobante de un cobro pendiente")
    info = await guardar_archivo(archivo, subcarpeta="comprobantes",solo_imagen=True)

    # Obtener última versión
    previos_q = await db.execute(
        select(ComprobantePago).where(ComprobantePago.cobro_id == id).order_by(ComprobantePago.version.desc())
    )
    previos = previos_q.scalars().all()
    nueva_version = 1
    if previos:
        nueva_version = previos[0].version + 1
        for p in previos:
            p.vigente = False # Inactivar versiones anteriores

    comp = ComprobantePago(
        cobro_id=cobro.id,
        clave_archivo=info["clave_archivo"],
        nombre_archivo=info["nombre_original"],
        tipo_mime=info["tipo_mime"],
        tamanio_bytes=info["tamano_bytes"],
        version=nueva_version,
        vigente=True,
        subido_por=usuario["sub"]
    )
    db.add(comp)

    await registrar_auditoria(
        db=db,
        accion="SUBIR_COMPROBANTE",
        entidad="comprobante_pago",
        entidad_id=comp.id,
        valores_despues={"version": nueva_version, "archivo": comp.clave_archivo},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {"mensaje": "Comprobante subido satisfactoriamente", "version": nueva_version}

@router.get("", response_model=List[dict])
async def listar_cobros(
    estado: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["TESORERIA", "REPARTIDOR", "JEFE", "ADMINISTRADOR"]))
):
    """Bandeja de cobros para Tesorería con filtros de contraste (RF-COB-03)."""
    query = (
        select(Cobro, Pedido, Cliente)
        .join(Pedido, Cobro.pedido_id == Pedido.id)
        .join(Cliente, Pedido.cliente_id == Cliente.id)
    )

    if estado:
        query = query.where(Cobro.estado == estado.upper())

    # Si es repartidor, solo ve los que él registró
    if usuario.get("rol", "").upper() == "REPARTIDOR":
        query = query.where(Cobro.registrado_por == usuario["sub"])

    result = await db.execute(query.order_by(Cobro.creado_en.desc()))
    filas = result.all()

    items = []
    for cob, ped, cli in filas:
        # Buscar comprobante vigente
        comp_q = await db.execute(
            select(ComprobantePago).where(ComprobantePago.cobro_id == cob.id, ComprobantePago.vigente == True)
        )
        comp = comp_q.scalars().first()

        # Buscar observaciones
        obs_q = await db.execute(
            select(ObservacionCobro).where(ObservacionCobro.cobro_id == cob.id).order_by(ObservacionCobro.creado_en.desc())
        )
        observaciones = obs_q.scalars().all()

        items.append({
            "id": cob.id,
            "pedido_id": ped.id,
            "codigo_pedido": ped.codigo_externo,
            "cliente": cli.nombre,
            "distrito": cli.distrito,
            "importe_pedido": ped.importe_total,
            "importe_cobrado": cob.importe,
            "medio_pago": cob.medio_pago,
            "numero_operacion": cob.numero_operacion,
            "estado": cob.estado,
            "tiene_comprobante": comp is not None,
            "comprobante_version": comp.version if comp else None,
            "observaciones": [{"texto": o.texto, "resuelta": o.resuelta} for o in observaciones],
            "creado_en": cob.creado_en
        })

    return items

@router.get("/{id}/comprobante/archivo")
async def descargar_comprobante(
    id: str,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["TESORERIA", "REPARTIDOR", "JEFE", "ADMINISTRADOR"]))
):
    """Visualizador y descarga con trazabilidad estricta (RNF-SEG-01)."""
    cobro=await db.get(Cobro,id)
    if not cobro:raise ErrorNoEncontrado("Cobro",id)
    if usuario['rol'].upper()=='REPARTIDOR' and int(cobro.registrado_por or 0)!=int(usuario['sub']):raise HTTPException(403,"El comprobante pertenece a otro repartidor")
    comp_q = await db.execute(
        select(ComprobantePago).where(ComprobantePago.cobro_id == id, ComprobantePago.vigente == True)
    )
    comp = comp_q.scalars().first()
    if not comp:
        raise ErrorNoEncontrado("ComprobantePago", id)

    # Registrar acceso
    acceso = AccesoComprobante(
        comprobante_id=comp.id,
        usuario_id=usuario["sub"],
        accion="VER"
    )
    db.add(acceso)
    await db.commit()

    ruta_disco = os.path.join(settings.UPLOAD_DIR, comp.clave_archivo)
    if not os.path.exists(ruta_disco):
        raise ErrorNoEncontrado("ArchivoFisico", comp.clave_archivo)

    return FileResponse(ruta_disco,media_type=comp.tipo_mime,filename=comp.nombre_archivo)

@router.post("/{id}/contraste")
async def contrastar_cobro(
    id: str,
    req: ContrasteRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["TESORERIA"]))
):
    """
    Contraste de Tesorería: CONFORME o OBSERVADO (RF-COB-04/05).
    - Si es OBSERVADO, observación obligatoria.
    - Si es CONFORME y cubre la deuda, se dispara cierre de pedido (RN-COB-01/02).
    """
    cobro = await db.scalar(select(Cobro).where(Cobro.id==id).with_for_update().execution_options(populate_existing=True))
    if not cobro:
        raise ErrorNoEncontrado("Cobro", id)

    if cobro.estado not in ["PENDIENTE_CONTRASTE","PENDIENTE"]:raise HTTPException(409,"El cobro ya fue contrastado")
    comprobante=await db.scalar(select(ComprobantePago).where(ComprobantePago.cobro_id==id,ComprobantePago.vigente==True))
    if not comprobante:raise HTTPException(409,"Falta adjuntar el comprobante antes del contraste")
    resultado = req.resultado.upper()

    if resultado not in ["CONFORME", "OBSERVADO"]:
        raise ErrorReglaNegocio("ESTADO_INVALIDO", "El resultado debe ser CONFORME u OBSERVADO.")

    if resultado == "OBSERVADO":
        if not req.observacion or not req.observacion.strip():
            raise ErrorReglaNegocio("OBSERVACION_REQUERIDA", "Para marcar como OBSERVADO es obligatorio ingresar el motivo.")
        cobro.estado = "OBSERVADO"
        cobro.nota = req.observacion.strip()
        obs = ObservacionCobro(
            cobro_id=cobro.id,
            texto=req.observacion.strip(),
            registrada_por=usuario["sub"]
        )
        db.add(obs)
    else:
        cobro.estado = "CONFORME"
        for obs in (await db.scalars(select(ObservacionCobro).where(ObservacionCobro.cobro_id==id,ObservacionCobro.resuelta==False))).all():obs.resuelta=True
        cobro.contrastado_por = usuario["sub"]
        cobro.contrastado_en = ahora()

        # Verificar si la suma de cobros conformes liquida el pedido para cierre automático
        pedido = await db.scalar(select(Pedido).where(Pedido.id_pedido==cobro.pedido_id).with_for_update())
        await db.flush()
        if pedido:
            c_q = await db.execute(
                select(Cobro).where(Cobro.pedido_id == pedido.id, Cobro.estado == "CONFORME")
            )
            conformes = c_q.scalars().all()
            suma = sum(c.importe for c in conformes) + (cobro.importe if cobro not in conformes else 0)
            if round(suma, 2) == round(pedido.importe, 2) and pedido.estado=="ENTREGADO":
                pedido.estado = "CERRADO"

    cobro.contrastado_por=usuario['sub'];cobro.contrastado_en=ahora()
    await registrar_auditoria(
        db=db,
        accion="CONTRASTE_COBRO",
        entidad="cobro",
        entidad_id=cobro.id,
        valores_despues={"estado": cobro.estado, "observacion": req.observacion, "movimiento_bancario":req.movimiento_bancario},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {"mensaje": f"Cobro marcado como {cobro.estado} exitosamente"}

@router.get("/exportacion.xlsx")
async def exportar_cobros_excel(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["TESORERIA", "JEFE", "ADMINISTRADOR"]))
):
    """Exportación a Excel para arqueo de caja con totales por medio y estado (RF-COB-07)."""
    result = await db.execute(
        select(Cobro, Pedido, Cliente)
        .join(Pedido, Cobro.pedido_id == Pedido.id)
        .join(Cliente, Pedido.cliente_id == Cliente.id)
    )
    filas = result.all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Detalle de Cobros"

    # Encabezados
    headers = ["ID Cobro", "Pedido", "Cliente", "Distrito", "Importe (S/)", "Medio de Pago", "N° Operación", "Estado", "Fecha"]
    ws.append(headers)

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")

    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    totales_por_medio = {}

    def texto_excel(value):
        value=str(value or "")
        return "'"+value if value.startswith(('=','+','-','@')) else value

    for row_idx, (c, p, cli) in enumerate(filas, start=2):
        ws.append([
            c.id[:8],
            texto_excel(p.codigo_externo),
            texto_excel(cli.nombre),
            texto_excel(cli.distrito),
            c.importe,
            c.medio_pago,
            texto_excel(c.numero_operacion or "-"),
            c.estado,
            c.creado_en.strftime("%d/%m/%Y %H:%M") if c.creado_en else "-"
        ])
        totales_por_medio[c.medio_pago] = totales_por_medio.get(c.medio_pago, 0) + c.importe

    # Hoja 2: Resumen Arqueo
    ws_resumen = wb.create_sheet(title="Resumen Arqueo")
    ws_resumen.append(["Medio de Pago", "Total Recaudado (S/)"])
    ws_resumen.cell(row=1, column=1).font = Font(bold=True)
    ws_resumen.cell(row=1, column=2).font = Font(bold=True)

    for medio, total in totales_por_medio.items():
        ws_resumen.append([medio, round(total, 2)])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=arqueo_cobros_siprd.xlsx"}
    )


class CorregirCobroRequest(BaseModel):
    model_config = {"str_strip_whitespace": True}
    importe: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    medio_pago: Literal["EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA", "DEPOSITO"]
    numero_operacion: str | None = Field(default=None, max_length=100)
    respuesta: str = Field(min_length=3, max_length=1000)

@router.put('/{id}/correccion')
async def corregir_cobro(id: str, req: CorregirCobroRequest, db: AsyncSession = Depends(get_db), usuario: dict = Depends(require_roles(['REPARTIDOR']))):
    cobro = await db.scalar(select(Cobro).where(Cobro.id == id).with_for_update().execution_options(populate_existing=True))
    if not cobro: raise HTTPException(404, 'Cobro no encontrado')
    if int(cobro.registrado_por or 0) != int(usuario['sub']): raise HTTPException(403, 'Este cobro pertenece a otro repartidor')
    if cobro.estado != 'OBSERVADO': raise HTTPException(409, 'Solo se corrigen cobros observados')
    if req.medio_pago != 'EFECTIVO' and not req.numero_operacion: raise HTTPException(422, 'Indica el número de operación')
    if req.numero_operacion and await db.scalar(select(Cobro).where(Cobro.id != id, Cobro.numero_operacion == req.numero_operacion, Cobro.metodo_pago == req.medio_pago)):
        raise HTTPException(409, 'La operación ya está registrada')
    antes = dict(importe=str(cobro.importe), medio_pago=cobro.medio_pago, numero_operacion=cobro.numero_operacion, estado=cobro.estado)
    cobro.importe=req.importe; cobro.medio_pago=req.medio_pago; cobro.numero_operacion=req.numero_operacion
    cobro.estado='PENDIENTE_CONTRASTE'; cobro.contrastado_por=None; cobro.contrastado_en=None
    cobro.nota='Subsanación del repartidor: '+req.respuesta
    # Keep the previous receipt for the history but require a new current version.
    for comp in (await db.scalars(select(ComprobantePago).where(ComprobantePago.cobro_id==id,ComprobantePago.vigente==True))).all():comp.vigente=False
    await registrar_auditoria(db,'CORREGIR_COBRO','cobro',id,usuario_id=usuario['sub'],valores_antes=antes,valores_despues={**req.model_dump(mode='json'),'estado':cobro.estado})
    await db.commit()
    return {'mensaje':'Corrección guardada. Adjunta el nuevo comprobante para su contraste.'}
