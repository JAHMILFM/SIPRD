from datetime import datetime
from fastapi import APIRouter, Depends, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.almacenamiento import guardar_archivo
from backend.app.core.config import settings
from backend.app.models import Cobro, ParadaRuta, Pedido, Cliente
import os

router = APIRouter(prefix="/cobros", tags=["Cobranzas"])
class RegistrarCobroRequest(BaseModel):
    parada_id: int
    monto: float = Field(gt=0)
    medio_pago: str
    numero_operacion: Optional[str] = None
class ContrasteRequest(BaseModel):
    resultado: str
    observacion: Optional[str] = None

@router.post("", status_code=status.HTTP_201_CREATED)
async def registrar_cobro(req: RegistrarCobroRequest, db: AsyncSession = Depends(get_db), usuario: dict = Depends(require_roles(["REPARTIDOR","ASISTENTE","JEFE","ADMINISTRADOR"]))):
    parada = await db.get(ParadaRuta, req.parada_id)
    if not parada: raise ErrorNoEncontrado("Parada",req.parada_id)
    medio = req.medio_pago.upper()
    if medio not in {"EFECTIVO","YAPE","PLIN","TRANSFERENCIA","DEPOSITO"}: raise ErrorReglaNegocio("MEDIO_PAGO_INVALIDO","Medio de pago no permitido.")
    if medio != "EFECTIVO" and not req.numero_operacion: raise ErrorReglaNegocio("NUM_OPERACION_REQUERIDO","Se requiere número de operación.")
    cobro = Cobro(id_parada=parada.id_parada,monto=req.monto,medio_pago=medio,numero_operacion=req.numero_operacion,estado="PENDIENTE",id_usuario_registro=int(usuario["sub"]))
    db.add(cobro); await db.flush(); await registrar_auditoria(db,"CREAR","cobro",cobro.id_cobro,valores_despues={"monto":req.monto},usuario_id=usuario["sub"]); await db.commit()
    return {"cobro_id":cobro.id_cobro,"mensaje":"Cobro registrado"}

@router.post("/{cobro_id}/comprobante")
async def subir_comprobante(cobro_id:int, archivo:UploadFile=File(...), db:AsyncSession=Depends(get_db), usuario:dict=Depends(require_roles(["REPARTIDOR","ASISTENTE","JEFE","ADMINISTRADOR"]))):
    cobro=await db.get(Cobro,cobro_id)
    if not cobro: raise ErrorNoEncontrado("Cobro",cobro_id)
    info=await guardar_archivo(archivo,"comprobantes")
    cobro.url_comprobante=info["clave_archivo"]; cobro.nombre_archivo=info["nombre_original"]; cobro.tipo_mime=info["tipo_mime"]
    await registrar_auditoria(db,"ACTUALIZAR","cobro",cobro_id,valores_despues={"comprobante":True},usuario_id=usuario["sub"]); await db.commit()
    return {"mensaje":"Comprobante registrado"}

@router.get("")
async def listar_cobros(estado:Optional[str]=Query(None),db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["TESORERIA","ASISTENTE","JEFE","ADMINISTRADOR","REPARTIDOR"]))):
    q=select(Cobro,ParadaRuta,Pedido,Cliente).join(ParadaRuta,Cobro.id_parada==ParadaRuta.id_parada).join(Pedido,ParadaRuta.id_pedido==Pedido.id_pedido).join(Cliente,Pedido.id_cliente==Cliente.id_cliente)
    if estado:q=q.where(Cobro.estado==estado.upper())
    if usuario.get("rol","").upper()=="REPARTIDOR":q=q.where(Cobro.id_usuario_registro==int(usuario["sub"]))
    return [{"id":c.id_cobro,"parada_id":c.id_parada,"pedido_id":p.id_pedido,"cliente":cl.razon_social,"monto":float(c.monto),"importe_pedido":float(p.importe_total),"medio_pago":c.medio_pago,"numero_operacion":c.numero_operacion,"estado":c.estado,"observacion":c.observacion,"tiene_comprobante":bool(c.url_comprobante)} for c,_,p,cl in (await db.execute(q)).all()]

@router.post("/{cobro_id}/contraste")
async def contrastar_cobro(cobro_id:int,req:ContrasteRequest,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["TESORERIA","JEFE","ADMINISTRADOR"]))):
    cobro=await db.get(Cobro,cobro_id)
    if not cobro:raise ErrorNoEncontrado("Cobro",cobro_id)
    resultado=req.resultado.upper()
    if resultado not in {"CONFORME","OBSERVADO"}:raise ErrorReglaNegocio("RESULTADO_INVALIDO","Resultado debe ser CONFORME u OBSERVADO.")
    if resultado=="OBSERVADO" and not req.observacion:raise ErrorReglaNegocio("OBSERVACION_REQUERIDA","Debe indicar la observación.")
    cobro.estado=resultado; cobro.observacion=req.observacion; cobro.id_usuario_validador=int(usuario["sub"]); cobro.fecha_validacion=datetime.now()
    await registrar_auditoria(db,"VALIDAR" if resultado=="CONFORME" else "OBSERVAR","cobro",cobro_id,valores_despues={"estado":resultado},usuario_id=usuario["sub"]); await db.commit(); return {"mensaje":"Contraste registrado","estado":resultado}

@router.get("/{cobro_id}/comprobante/archivo")
async def descargar_comprobante(cobro_id:int,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["TESORERIA","ASISTENTE","JEFE","ADMINISTRADOR","REPARTIDOR"]))):
    c=await db.get(Cobro,cobro_id)
    if not c or not c.url_comprobante:raise ErrorNoEncontrado("Comprobante",cobro_id)
    ruta=os.path.join(settings.UPLOAD_DIR,c.url_comprobante)
    if not os.path.isfile(ruta):raise ErrorNoEncontrado("Archivo",c.url_comprobante)
    await registrar_auditoria(db,"VALIDAR","cobro",cobro_id,valores_despues={"acceso_comprobante":True},usuario_id=usuario["sub"]); await db.commit(); return FileResponse(ruta,filename=c.nombre_archivo)
