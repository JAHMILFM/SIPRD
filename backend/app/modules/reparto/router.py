from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado
from backend.app.core.almacenamiento import guardar_archivo
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Ruta,ParadaRuta,Pedido,Cliente,Vehiculo,EvidenciaEntrega,Incidencia,Planificacion
router=APIRouter(prefix="/reparto",tags=["Reparto"])

@router.get("/ruta/{ruta_id}")
async def obtener_ruta(ruta_id:int,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["REPARTIDOR","ASISTENTE","JEFE","ADMINISTRADOR"]))):
 ruta=await db.get(Ruta,ruta_id)
 if not ruta:raise ErrorNoEncontrado("Ruta",ruta_id)
 vehiculo=await db.get(Vehiculo,ruta.id_vehiculo)
 stops=(await db.execute(select(ParadaRuta,Pedido,Cliente).join(Pedido,ParadaRuta.id_pedido==Pedido.id_pedido).join(Cliente,Pedido.id_cliente==Cliente.id_cliente).where(ParadaRuta.id_ruta==ruta_id).order_by(ParadaRuta.secuencia))).all()
 return {"ruta_id":ruta_id,"vehiculo":vehiculo.placa,"estado":ruta.estado,"paradas":[{"id":x.id_parada,"pedido":p.codigo_externo,"cliente":c.razon_social,"direccion":c.direccion,"estado":x.estado,"secuencia":x.secuencia} for x,p,c in stops]}

@router.post("/paradas/{parada_id}/evidencias",status_code=status.HTTP_201_CREATED)
async def registrar_evidencia(parada_id:int,archivo:UploadFile=File(...),descripcion:str=Form(None),db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["REPARTIDOR","ASISTENTE","JEFE","ADMINISTRADOR"]))):
 parada=await db.get(ParadaRuta,parada_id)
 if not parada:raise ErrorNoEncontrado("Parada",parada_id)
 info=await guardar_archivo(archivo,"evidencias")
 evidencia=EvidenciaEntrega(id_parada=parada_id,url_archivo=info["clave_archivo"],nombre_archivo=info["nombre_original"],tipo_mime=info["tipo_mime"],descripcion=descripcion,id_usuario_registro=int(usuario["sub"]))
 db.add(evidencia); parada.estado="ATENDIDA"; parada.hora_llegada_real=datetime.now(); pedido=await db.get(Pedido,parada.id_pedido); pedido.estado="ENTREGADO"
 await registrar_auditoria(db,"ACTUALIZAR","parada",parada_id,valores_despues={"estado":"ATENDIDA"},usuario_id=usuario["sub"]); await db.commit(); return {"evidencia_id":evidencia.id_evidencia,"mensaje":"Evidencia registrada"}

@router.post("/paradas/{parada_id}/incidencias",status_code=status.HTTP_201_CREATED)
async def registrar_incidencia(parada_id:int,tipo:str=Form(...),descripcion:str=Form(...),db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["REPARTIDOR","ASISTENTE","JEFE","ADMINISTRADOR"]))):
 parada=await db.get(ParadaRuta,parada_id)
 if not parada:raise ErrorNoEncontrado("Parada",parada_id)
 inc=Incidencia(id_parada=parada_id,tipo=tipo.upper(),descripcion=descripcion,estado="ABIERTA",id_usuario_registro=int(usuario["sub"]));db.add(inc);parada.estado="NO_ATENDIDA"
 await db.flush();await registrar_auditoria(db,"CREAR","incidencia",inc.id_incidencia,valores_despues={"tipo":tipo},usuario_id=usuario["sub"]);await db.commit();return {"incidencia_id":inc.id_incidencia,"mensaje":"Incidencia registrada"}
