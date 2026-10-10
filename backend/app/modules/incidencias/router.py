from fastapi import APIRouter,Depends,Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Incidencia,ParadaRuta
router=APIRouter(prefix="/incidencias",tags=["Incidencias"])
class Actualizar(BaseModel): estado:str
@router.get("")
async def listar(estado:Optional[str]=Query(None),db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
 q=select(Incidencia)
 if estado:q=q.where(Incidencia.estado==estado.upper())
 return [{"id":i.id_incidencia,"parada_id":i.id_parada,"tipo":i.tipo,"descripcion":i.descripcion,"estado":i.estado,"fecha_hora":i.fecha_hora} for i in (await db.execute(q)).scalars()]
@router.patch("/{incidencia_id}")
async def actualizar(incidencia_id:int,req:Actualizar,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
 i=await db.get(Incidencia,incidencia_id)
 if not i:raise ErrorNoEncontrado("Incidencia",incidencia_id)
 i.estado=req.estado.upper();await registrar_auditoria(db,"ACTUALIZAR","incidencia",incidencia_id,valores_despues={"estado":i.estado},usuario_id=usuario["sub"]);await db.commit();return {"mensaje":"Incidencia actualizada"}
