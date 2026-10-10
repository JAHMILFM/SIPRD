from fastapi import HTTPException
from sqlalchemy import select
from backend.app.models import Ruta, Parada, PlanificacionVersion, Planificacion

async def parada_autorizada(db, id, usuario):
    parada=await db.get(Parada,int(id))
    if not parada:raise HTTPException(404,'Parada no encontrada')
    ruta=await db.get(Ruta,parada.id_ruta)
    if usuario['rol'].upper()=='REPARTIDOR' and ruta.id_repartidor!=int(usuario['sub']):
        raise HTTPException(403,'La parada no está asignada a este repartidor')
    version=await db.get(PlanificacionVersion,ruta.version_id) if ruta.version_id else None
    plan=await db.get(Planificacion,version.planificacion_id) if version else None
    if not version or version.estado!='CONFIRMADA' or plan.version_vigente!=version.numero:
        raise HTTPException(409,'La ruta no corresponde a una planificación confirmada vigente')
    return parada,ruta

async def pedido_asignado(db,pedido_id,usuario):
    rows=(await db.scalars(select(Parada).join(Ruta,Parada.id_ruta==Ruta.id_ruta)
        .join(PlanificacionVersion,Ruta.version_id==PlanificacionVersion.id)
        .join(Planificacion,PlanificacionVersion.planificacion_id==Planificacion.id)
        .where(Parada.id_pedido==int(pedido_id),Ruta.id_repartidor==int(usuario['sub']),
               PlanificacionVersion.estado=='CONFIRMADA',Planificacion.version_vigente==PlanificacionVersion.numero))).all()
    if not rows:raise HTTPException(403,'El pedido no está asignado a este repartidor')
    return rows[0]
