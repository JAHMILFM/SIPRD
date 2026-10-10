from datetime import time
from fastapi import APIRouter, Depends, status, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import RestriccionCliente, Cliente
router=APIRouter(tags=["Restricciones de clientes"])
class RestriccionCreate(BaseModel):
 tipo_restriccion:str
 dia_semana:Optional[int]=None
 fecha_especifica:Optional[str]=None
 hora_inicio:Optional[str]=None
 hora_fin:Optional[str]=None
 observacion:Optional[str]=None

def hora(v): return time.fromisoformat(v) if v else None
@router.get("/clientes/{cliente_id}/restricciones")
async def listar(cliente_id:int,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
 filas=(await db.execute(select(RestriccionCliente).where(RestriccionCliente.id_cliente==cliente_id))).scalars().all()
 return [{"id":r.id_restriccion,"tipo_restriccion":r.tipo_restriccion,"dia_semana":r.dia_semana,"fecha_especifica":r.fecha_especifica,"hora_inicio":r.hora_inicio,"hora_fin":r.hora_fin,"observacion":r.observacion,"activo":r.activo} for r in filas]
@router.post("/clientes/{cliente_id}/restricciones",status_code=status.HTTP_201_CREATED)
async def crear(cliente_id:int,req:RestriccionCreate,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
 if not await db.get(Cliente,cliente_id):raise ErrorNoEncontrado("Cliente",cliente_id)
 tipo=req.tipo_restriccion.upper()
 if tipo not in {"RECIBE","NO_RECIBE","PRIORIDAD"}:raise ErrorReglaNegocio("TIPO_INVALIDO","Tipo de restricción inválido.")
 if not req.dia_semana and not req.fecha_especifica:raise ErrorReglaNegocio("FECHA_REQUERIDA","Indique día de semana o fecha específica.")
 ini,fin=hora(req.hora_inicio),hora(req.hora_fin)
 if bool(ini)!=bool(fin) or (ini and ini>=fin):raise ErrorReglaNegocio("HORARIO_INVALIDO","El intervalo horario no es válido.")
 from datetime import date
 r=RestriccionCliente(id_cliente=cliente_id,tipo_restriccion=tipo,dia_semana=req.dia_semana,fecha_especifica=date.fromisoformat(req.fecha_especifica) if req.fecha_especifica else None,hora_inicio=ini,hora_fin=fin,observacion=req.observacion)
 db.add(r);await db.flush();await registrar_auditoria(db,"CREAR","restriccion_cliente",r.id_restriccion,valores_despues={"tipo":tipo},usuario_id=usuario["sub"]);await db.commit();return {"id":r.id_restriccion,"mensaje":"Restricción registrada"}
@router.patch("/restricciones/{restriccion_id}")
async def actualizar(restriccion_id:int,req:RestriccionCreate,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
 r=await db.get(RestriccionCliente,restriccion_id)
 if not r:raise ErrorNoEncontrado("Restricción",restriccion_id)
 for k,v in req.model_dump(exclude_none=True).items(): setattr(r,k,v.upper() if k=="tipo_restriccion" else v)
 await registrar_auditoria(db,"ACTUALIZAR","restriccion_cliente",restriccion_id,usuario_id=usuario["sub"]);await db.commit();return {"mensaje":"Restricción actualizada"}
@router.post("/restricciones/{restriccion_id}/desactivar")
async def desactivar(restriccion_id:int,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
 r=await db.get(RestriccionCliente,restriccion_id)
 if not r:raise ErrorNoEncontrado("Restricción",restriccion_id)
 r.activo=False;await registrar_auditoria(db,"DESACTIVAR","restriccion_cliente",restriccion_id,usuario_id=usuario["sub"]);await db.commit();return {"mensaje":"Restricción desactivada"}
