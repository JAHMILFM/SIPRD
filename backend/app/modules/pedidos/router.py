from datetime import date, datetime
from fastapi import APIRouter, Depends, status, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Pedido, Cliente, Cobro, ParadaRuta

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])

class ImportarPedidosRequest(BaseModel):
    fecha_programada: str
    origen: str = "BASE_CORPORATIVA"
    pedidos_datos: List[dict] = []

def fecha_valor(valor: str) -> date:
    return datetime.strptime(valor, "%d/%m/%Y").date() if "/" in valor else date.fromisoformat(valor)

@router.get("")
async def listar_pedidos(estado: Optional[str] = Query(None), fecha: Optional[str] = Query(None), db: AsyncSession = Depends(get_db), usuario: dict = Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR","TESORERIA"]))):
    query = select(Pedido, Cliente).join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
    if estado: query = query.where(Pedido.estado == estado.upper())
    if fecha: query = query.where(Pedido.fecha_programada == fecha_valor(fecha))
    filas = (await db.execute(query)).all()
    return [{"id": p.id_pedido, "codigo_externo": p.codigo_externo, "fecha_programada": p.fecha_programada,
             "peso_kg": float(p.peso_kg), "volumen_m3": float(p.volumen_m3), "importe_total": float(p.importe_total), "estado": p.estado,
             "cliente": {"id": c.id_cliente,"nombre": c.razon_social,"direccion":c.direccion,"distrito":c.distrito,"lat":float(c.latitud) if c.latitud is not None else None,"lon":float(c.longitud) if c.longitud is not None else None}}
            for p,c in filas]

@router.post("/importaciones", status_code=status.HTTP_201_CREATED)
async def importar_pedidos(req: ImportarPedidosRequest, db: AsyncSession = Depends(get_db), usuario: dict = Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
    nuevos, errores = 0, []
    for item in req.pedidos_datos:
        codigo = str(item.get("codigo_externo") or item.get("id") or "").strip()
        if not codigo: errores.append({"motivo":"Falta codigo_externo"}); continue
        if (await db.execute(select(Pedido).where(Pedido.codigo_externo == codigo))).scalars().first(): continue
        nombre = item.get("cliente") or item.get("nombre_cliente") or f"Cliente {codigo}"
        cliente = (await db.execute(select(Cliente).where(Cliente.razon_social == nombre))).scalars().first()
        if not cliente:
            cliente = Cliente(codigo_externo=f"CLI-{codigo}", razon_social=nombre, direccion=item.get("direccion") or item.get("dir") or "Sin dirección", distrito=item.get("distrito") or item.get("dist"), provincia="Lima", latitud=item.get("lat"), longitud=item.get("lon"))
            db.add(cliente); await db.flush()
        try:
            pedido = Pedido(codigo_externo=codigo, id_cliente=cliente.id_cliente, fecha_pedido=datetime.now(), fecha_programada=fecha_valor(req.fecha_programada), peso_kg=float(item.get("peso_kg", item.get("peso", 0))), volumen_m3=float(item.get("volumen_m3", item.get("vol", 0))), importe_total=float(item.get("importe_total", item.get("importe", 0))), estado="PENDIENTE", origen=req.origen)
            db.add(pedido); nuevos += 1
        except (TypeError, ValueError): errores.append({"codigo":codigo,"motivo":"Datos numéricos inválidos"})
    await registrar_auditoria(db,"CREAR","importacion",0,valores_despues={"nuevos":nuevos,"errores":len(errores)},usuario_id=usuario["sub"])
    await db.commit()
    return {"total_nuevos":nuevos,"total_rechazados":len(errores),"detalle_errores":errores}

@router.post("/{pedido_id}/cerrar")
async def cerrar_pedido(pedido_id: int, db: AsyncSession = Depends(get_db), usuario: dict = Depends(require_roles(["TESORERIA","JEFE","ADMINISTRADOR"]))):
    pedido = await db.get(Pedido,pedido_id)
    if not pedido: raise ErrorNoEncontrado("Pedido",pedido_id)
    cobros = (await db.execute(select(Cobro).join(ParadaRuta, Cobro.id_parada == ParadaRuta.id_parada).where(ParadaRuta.id_pedido == pedido_id, Cobro.estado == "CONFORME"))).scalars().all()
    total = sum(float(c.monto) for c in cobros)
    if total < float(pedido.importe_total): raise ErrorReglaNegocio("CIERRE_NO_PERMITIDO","El cobro conforme no cubre el importe del pedido.")
    previo = pedido.estado; pedido.estado = "ENTREGADO"
    await registrar_auditoria(db,"VALIDAR","pedido",pedido_id,{"estado":previo},{"estado":"ENTREGADO"},usuario["sub"])
    await db.commit(); return {"mensaje":"Pedido cerrado"}
