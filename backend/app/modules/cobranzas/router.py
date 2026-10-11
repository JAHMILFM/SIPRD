from datetime import date
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from openpyxl import Workbook
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import (
    ErrorNoEncontrado,
    ErrorReglaNegocio,
)
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.almacenamiento import guardar_archivo
from backend.app.core.config import settings
from backend.app.core.tiempo import ahora
from backend.app.core.reparto import autorizar_parada
from backend.app.models import Cobro, ParadaRuta, Pedido, Cliente

router = APIRouter(prefix="/cobros", tags=["Cobranzas"])
lectura = require_roles(
    ["TESORERIA", "ASISTENTE", "JEFE", "ADMINISTRADOR", "REPARTIDOR"]
)
escritura = require_roles(["REPARTIDOR", "ASISTENTE", "JEFE"])


class DatosCobro(BaseModel):
    monto: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    medio_pago: str
    numero_operacion: str | None = Field(None, max_length=100)


class Registrar(DatosCobro):
    parada_id: int


class Contraste(BaseModel):
    resultado: str
    observacion: str | None = Field(None, max_length=1000)


def datos(req):
    medio = req.medio_pago.upper()
    if medio not in {"EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA", "DEPOSITO", "CHEQUE"}:
        raise ErrorReglaNegocio("MEDIO_INVALIDO", "Medio de pago no permitido.")
    if medio != "EFECTIVO" and not (req.numero_operacion or "").strip():
        raise ErrorReglaNegocio(
            "OPERACION_REQUERIDA", "Indique el número de operación."
        )
    return medio


async def editable(db, c, usuario):
    s = await autorizar_parada(db, c.id_parada, usuario)
    p = (
        (
            await db.execute(
                select(Pedido).where(Pedido.id_pedido == s.id_pedido).with_for_update()
            )
        )
        .scalars()
        .one()
    )
    await db.refresh(c)
    if p.cierre_financiero or c.estado == "CONFORME":
        raise ErrorReglaNegocio(
            "COBRO_NO_EDITABLE", "El cobro ya fue confirmado o el pedido está cerrado."
        )
    return p


@router.post("", status_code=201)
async def registrar(req: Registrar, db=Depends(get_db), usuario=Depends(escritura)):
    s = await autorizar_parada(db, req.parada_id, usuario)
    p = (
        (
            await db.execute(
                select(Pedido).where(Pedido.id_pedido == s.id_pedido).with_for_update()
            )
        )
        .scalars()
        .one()
    )
    if p.cierre_financiero:
        raise ErrorReglaNegocio(
            "PEDIDO_CERRADO", "El pedido ya tiene cierre financiero."
        )
    c = Cobro(
        id_parada=s.id_parada,
        monto=req.monto,
        medio_pago=datos(req),
        numero_operacion=req.numero_operacion,
        estado="PENDIENTE",
        id_usuario_registro=int(usuario["sub"]),
    )
    db.add(c)
    await db.flush()
    await registrar_auditoria(
        db,
        "CREAR",
        "cobro",
        c.id_cobro,
        valores_despues={"monto": str(req.monto)},
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return {
        "cobro_id": c.id_cobro,
        "mensaje": "Cobro registrado, pendiente de validación",
    }


@router.put("/{cobro_id}")
async def corregir(
    cobro_id: int, req: DatosCobro, db=Depends(get_db), usuario=Depends(escritura)
):
    c = await db.get(Cobro, cobro_id)
    if not c:
        raise ErrorNoEncontrado("Cobro", cobro_id)
    await editable(db, c, usuario)
    previo = {"monto": str(c.monto), "estado": c.estado, "observacion": c.observacion}
    c.monto = req.monto
    c.medio_pago = datos(req)
    c.numero_operacion = req.numero_operacion
    c.estado = "PENDIENTE"
    c.id_usuario_validador = None
    c.fecha_validacion = None
    await registrar_auditoria(
        db,
        "ACTUALIZAR",
        "cobro",
        cobro_id,
        previo,
        {"monto": str(c.monto), "estado": c.estado},
        usuario["sub"],
    )
    await db.commit()
    return {"mensaje": "Corrección enviada a Tesorería"}


@router.post("/{cobro_id}/comprobante")
async def comprobante(
    cobro_id: int,
    archivo: UploadFile = File(...),
    db=Depends(get_db),
    usuario=Depends(escritura),
):
    c = await db.get(Cobro, cobro_id)
    if not c:
        raise ErrorNoEncontrado("Cobro", cobro_id)
    await editable(db, c, usuario)
    info = await guardar_archivo(archivo, "comprobantes")
    c.url_comprobante = info["clave_archivo"]
    c.nombre_archivo = info["nombre_original"]
    c.tipo_mime = info["tipo_mime"]
    c.estado = "PENDIENTE"
    c.id_usuario_validador = None
    c.fecha_validacion = None
    await registrar_auditoria(
        db,
        "ACTUALIZAR",
        "cobro",
        cobro_id,
        valores_despues={"comprobante": True},
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return {"mensaje": "Comprobante enviado"}


@router.get("")
async def listar(
    estado: str | None = None,
    fecha: date | None = None,
    db=Depends(get_db),
    usuario=Depends(lectura),
):
    q = (
        select(Cobro, ParadaRuta, Pedido, Cliente)
        .join(ParadaRuta, Cobro.id_parada == ParadaRuta.id_parada)
        .join(Pedido, ParadaRuta.id_pedido == Pedido.id_pedido)
        .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
    )
    if estado:
        q = q.where(Cobro.estado == estado.upper())
    if fecha:
        q = q.where(Pedido.fecha_programada == fecha)
    if usuario["rol"] == "REPARTIDOR":
        q = q.where(
            Cobro.id_usuario_registro == int(usuario["sub"]),
            Pedido.fecha_programada == usuario["fecha_reparto"],
        )
    filas = (await db.execute(q.order_by(Cobro.id_cobro.desc()))).all()
    return [
        {
            "id": c.id_cobro,
            "parada_id": s.id_parada,
            "pedido_id": p.id_pedido,
            "pedido": p.codigo_externo,
            "cliente": cl.razon_social,
            "monto": float(c.monto),
            "importe_pedido": float(p.importe_total),
            "medio_pago": c.medio_pago,
            "numero_operacion": c.numero_operacion,
            "estado": c.estado,
            "observacion": c.observacion,
            "tiene_comprobante": bool(c.url_comprobante),
            "fecha": c.fecha_registro,
            "entregado": p.estado == "ENTREGADO",
            "cierre_financiero": p.cierre_financiero,
        }
        for c, s, p, cl in filas
    ]


@router.get("/exportacion.xlsx")
async def exportar(
    fecha: date | None = None,
    db=Depends(get_db),
    usuario=Depends(require_roles(["TESORERIA", "JEFE"])),
):
    filas = await listar(fecha=fecha, db=db, usuario=usuario)
    w = Workbook()
    sh = w.active
    sh.title = "Arqueo"
    sh.append(
        [
            "Cobro",
            "Pedido",
            "Cliente",
            "Fecha",
            "Medio de pago",
            "Operación",
            "Monto registrado",
            "Estado",
            "Observación",
        ]
    )
    for c in filas:
        # Las cadenas externas se fuerzan a texto para evitar fórmulas al abrir Excel.
        vals = [
            c["id"],
            c["pedido"],
            c["cliente"],
            str(c["fecha"]),
            c["medio_pago"],
            c["numero_operacion"] or "",
            c["monto"],
            c["estado"],
            c["observacion"] or "",
        ]
        sh.append(vals)
        for cell in sh[sh.max_row]:
            if isinstance(cell.value, str):
                cell.data_type = "s"
    sh.freeze_panes = "A2"
    sh.auto_filter.ref = sh.dimensions
    for col in "ABCDEFGHI":
        sh.column_dimensions[col].width = 23
    buf = BytesIO()
    w.save(buf)
    buf.seek(0)
    await registrar_auditoria(
        db,
        "VALIDAR",
        "exportacion_cobros",
        0,
        valores_despues={"filas": len(filas)},
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=arqueo_siprd.xlsx",
            "Cache-Control": "no-store",
        },
    )


@router.post("/{cobro_id}/contraste")
async def contrastar(
    cobro_id: int,
    req: Contraste,
    db=Depends(get_db),
    usuario=Depends(require_roles(["TESORERIA"])),
):
    c = await db.get(Cobro, cobro_id)
    if not c:
        raise ErrorNoEncontrado("Cobro", cobro_id)
    s = await db.get(ParadaRuta, c.id_parada)
    p = (
        (
            await db.execute(
                select(Pedido).where(Pedido.id_pedido == s.id_pedido).with_for_update()
            )
        )
        .scalars()
        .one()
    )
    await db.refresh(c)
    if p.cierre_financiero:
        raise ErrorReglaNegocio("PEDIDO_CERRADO", "El pedido ya está cerrado.")
    resultado = req.resultado.upper()
    if resultado not in ("CONFORME", "OBSERVADO"):
        raise ErrorReglaNegocio(
            "RESULTADO_INVALIDO", "Seleccione CONFORME u OBSERVADO."
        )
    if resultado == "OBSERVADO" and not (req.observacion or "").strip():
        raise ErrorReglaNegocio(
            "OBSERVACION_REQUERIDA", "Escriba la observación para el repartidor."
        )
    if resultado == "CONFORME" and c.medio_pago != "EFECTIVO" and not c.url_comprobante:
        raise ErrorReglaNegocio(
            "COMPROBANTE_REQUERIDO", "Falta el comprobante del pago."
        )
    antes = {"estado": c.estado, "observacion": c.observacion}
    c.estado = resultado
    c.observacion = req.observacion if resultado == "OBSERVADO" else None
    c.id_usuario_validador = int(usuario["sub"])
    c.fecha_validacion = ahora()
    await registrar_auditoria(
        db,
        "VALIDAR" if resultado == "CONFORME" else "OBSERVAR",
        "cobro",
        cobro_id,
        antes,
        {"estado": resultado, "observacion": c.observacion},
        usuario["sub"],
    )
    await db.commit()
    return {"mensaje": "Validación registrada", "estado": resultado}


@router.get("/{cobro_id}/comprobante/archivo")
async def descargar(cobro_id: int, db=Depends(get_db), usuario=Depends(lectura)):
    c = await db.get(Cobro, cobro_id)
    if not c or not c.url_comprobante:
        raise ErrorNoEncontrado("Comprobante", cobro_id)
    if usuario["rol"] == "REPARTIDOR":
        await autorizar_parada(db, c.id_parada, usuario)
    ruta = (Path(settings.UPLOAD_DIR) / c.url_comprobante).resolve()
    if (
        not ruta.is_relative_to(Path(settings.UPLOAD_DIR).resolve())
        or not ruta.is_file()
    ):
        raise ErrorNoEncontrado("Archivo", cobro_id)
    await registrar_auditoria(
        db,
        "VALIDAR",
        "cobro",
        cobro_id,
        valores_despues={"acceso_comprobante": True},
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return FileResponse(
        ruta, media_type=c.tipo_mime, headers={"Cache-Control": "no-store"}
    )
