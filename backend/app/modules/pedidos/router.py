from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import math
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Pedido, Cliente, ImportacionPedidos, Cobro

router = APIRouter(prefix="/pedidos", tags=["Pedidos e Importaciones"])

class ImportarCorteRequest(BaseModel):
    fecha_corte: str = "27/08/2026"
    origen: str = "SIMULADO"
    pedidos_datos: Optional[List[dict]] = None

@router.get("", response_model=List[dict])
async def listar_pedidos(
    estado: Optional[str] = Query(None),
    fecha: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR", "TESORERIA"]))
):
    query = select(Pedido, Cliente).join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
    if estado:
        query = query.where(Pedido.estado == estado.upper())
    if fecha:
        try:
            if "/" in fecha:
                d, m, y = map(int, fecha.split("/"))
                query = query.where(Pedido.fecha_programada == date(y, m, d))
            else:
                query = query.where(Pedido.fecha_programada == date.fromisoformat(fecha))
        except Exception:
            query = query.where(Pedido.fecha_corte == fecha)
    
    result = await db.execute(query)
    filas = result.all()
    return [
        {
            "id": p.id,
            "id_pedido": p.id,
            "codigo_externo": p.codigo_externo,
            "fecha_corte": p.fecha_corte,
            "peso_kg": p.peso_kg,
            "peso": p.peso_kg,
            "volumen_m3": p.volumen_m3,
            "vol": p.volumen_m3,
            "importe_total": p.importe_total,
            "importe": p.importe_total,
            "tiempo_servicio_min": p.tiempo_servicio_min,
            "servicio": p.tiempo_servicio_min,
            "estado": p.estado,
            "cliente": {
                "id": c.id,
                "nombre": c.nombre,
                "direccion": c.direccion,
                "distrito": c.distrito,
                "lat": c.lat,
                "lon": c.lon
            }
        }
        for p, c in filas
    ]

@router.post("/importaciones", status_code=status.HTTP_201_CREATED)
async def importar_corte(
    req: ImportarCorteRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    """
    Importa pedidos para una fecha de corte (RF-INT-01).
    Idempotente por codigo_externo. Valida datos y rechaza inválidos con su motivo.
    """
    try:
        fecha_programada = datetime.strptime(req.fecha_corte, "%d/%m/%Y").date() if "/" in req.fecha_corte else date.fromisoformat(req.fecha_corte)
    except ValueError:
        raise HTTPException(status_code=422, detail="Fecha de corte invalida; use DD/MM/AAAA o AAAA-MM-DD")
    datos = req.pedidos_datos or []
    
    total_leidos = len(datos)
    total_nuevos = 0
    total_rechazados = 0
    detalle_errores = []

    importacion = ImportacionPedidos(
        nombre_archivo=f"{req.origen}-{fecha_programada.isoformat()}",
        importado_por=usuario["sub"],
        filas_totales=total_leidos,
        filas_validas=0,
        estado="EN_PROCESO"
    )
    db.add(importacion)
    await db.flush()

    for item in datos:
        cod = str(item.get("codigo_externo") or item.get("id") or "").strip()
        if not cod:
            total_rechazados += 1
            detalle_errores.append({"codigo": "SIN_CODIGO", "motivo": "Falta código de pedido"})
            continue

        # Validar peso y volumen
        try:
            peso = float(item.get("peso_kg") or item.get("peso") or 0)
            vol = float(item.get("volumen_m3") or item.get("vol") or 0)
            importe = float(item.get("importe") or item.get("importe_total") or 150.0)
            lat = float(item.get("lat") if item.get("lat") is not None else -12.0464)
            lon = float(item.get("lon") if item.get("lon") is not None else -77.0428)
            validos = all(math.isfinite(v) for v in (peso, vol, importe, lat, lon)) and importe >= 0 and -90 <= lat <= 90 and -180 <= lon <= 180
        except (ValueError, TypeError):
            validos = False
        if not validos or peso <= 0 or vol <= 0:
            total_rechazados += 1
            detalle_errores.append({"codigo": cod, "motivo": "Peso, volumen, importe o coordenadas invalidos"})
            continue

        # Buscar o registrar cliente
        nombre_cli = item.get("cliente") or item.get("nombre_cliente") or f"Cliente {cod}"
        dir_cli = item.get("dir") or item.get("direccion") or "Lima Metropolitana"
        dist_cli = item.get("dist") or item.get("distrito") or "Lima"

        # Buscar cliente existente por nombre o código
        cli_q = await db.execute(select(Cliente).where(Cliente.razon_social == nombre_cli))
        cliente = cli_q.scalars().first()
        if not cliente:
            cliente = Cliente(
                codigo_externo=f"CLI-{cod}",
                razon_social=nombre_cli,
                direccion=dir_cli,
                distrito=dist_cli,
                latitud=lat,
                longitud=lon
            )
            db.add(cliente)
            await db.flush()

        # Idempotencia: Verificar si el pedido ya fue importado
        ped_q = await db.execute(select(Pedido).where(Pedido.codigo_externo == cod))
        pedido_existente = ped_q.scalars().first()
        if pedido_existente:
            # Ya existe, no duplicar
            continue

        nuevo_pedido = Pedido(
            codigo_externo=cod,
            cliente_id=cliente.id,
            fecha_programada=fecha_programada,
            origen=req.origen,
            peso_kg=peso,
            volumen_m3=vol,
            importe=importe,
            tiempo_servicio_min=int(item.get("tiempo_servicio_min") or item.get("servicio") or 15),
            estado="PENDIENTE",
        )
        db.add(nuevo_pedido)
        await db.flush()
        total_nuevos += 1

    importacion.filas_validas = total_nuevos
    importacion.filas_con_error = total_rechazados
    importacion.errores = detalle_errores
    importacion.estado = "COMPLETADA"

    await registrar_auditoria(
        db=db,
        accion="IMPORTAR_PEDIDOS",
        entidad="importacion_pedidos",
        entidad_id=importacion.id,
        valores_despues={"total_nuevos": total_nuevos, "rechazados": total_rechazados},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {
        "importacion_id": importacion.id,
        "total_leidos": total_leidos,
        "total_nuevos": total_nuevos,
        "total_rechazados": total_rechazados,
        "detalle_errores": detalle_errores
    }

@router.post("/{id}/cerrar")
async def cerrar_pedido(
    id: str,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["TESORERIA", "JEFE", "ADMINISTRADOR"]))
):
    """
    Cierre formal del pedido (RN-COB-01 y RN-COB-02):
    El pedido solo se cierra si la suma de cobros CONFORME es igual al importe_total.
    """
    p = await db.get(Pedido, id)
    if not p:
        raise ErrorNoEncontrado("Pedido", id)

    # Verificar cobros conforme
    cobros_q = await db.execute(
        select(Cobro).where(Cobro.pedido_id == id, Cobro.estado == "CONFORME")
    )
    cobros_conforme = cobros_q.scalars().all()
    suma_conforme = sum(c.importe for c in cobros_conforme)

    if round(suma_conforme, 2) < round(p.importe_total, 2):
        raise ErrorReglaNegocio(
            regla="CIERRE_NO_PERMITIDO",
            mensaje=f"No se puede cerrar el pedido {p.codigo_externo}. Total pagado conforme S/ {suma_conforme:.2f} no cubre el total de S/ {p.importe_total:.2f} (RN-COB-01)."
        )

    estado_prev = p.estado
    p.estado = "CERRADO"

    await registrar_auditoria(
        db=db,
        accion="CERRAR_PEDIDO",
        entidad="pedido",
        entidad_id=p.id,
        valores_antes={"estado": estado_prev},
        valores_despues={"estado": "CERRADO"},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {"mensaje": f"Pedido {p.codigo_externo} cerrado satisfactoriamente"}
