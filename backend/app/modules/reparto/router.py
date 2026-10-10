from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.operacion import parada_autorizada
from backend.app.core.almacenamiento import guardar_archivo
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.config import settings
from backend.app.core.tiempo import ahora
from backend.app.models import EvidenciaEntrega, Pedido, Incidencia

router=APIRouter(prefix='/reparto',tags=['Reparto'])
repartidor=require_roles(['REPARTIDOR'])

@router.get('/mi-ruta')
async def mi_ruta(db:AsyncSession=Depends(get_db),u:dict=Depends(repartidor)):
    from backend.app.datos_web import cargar_datos
    data=await cargar_datos(db,u)
    return {'rutas':data['rutas']}

@router.post('/paradas/{id}/evidencias',status_code=201)
async def entregar(id:int,archivo:UploadFile=File(...),db:AsyncSession=Depends(get_db),u:dict=Depends(repartidor)):
    parada,ruta=await parada_autorizada(db,id,u)
    pedido=await db.get(Pedido,parada.id_pedido)
    if pedido.estado in ['CANCELADO','CERRADO']:raise HTTPException(409,'El pedido está finalizado')
    info=await guardar_archivo(archivo,'evidencias',solo_imagen=True)
    e=EvidenciaEntrega(parada_id=id,tipo='FOTO',nombre_archivo=info['nombre_original'],tipo_mime=info['tipo_mime'],
        tamanio_bytes=info['tamano_bytes'],ruta_almacenamiento=info['clave_archivo'])
    db.add(e);await db.flush()
    parada.estado='ATENDIDA';parada.hora_llegada_real=ahora();pedido.estado='ENTREGADO'
    await registrar_auditoria(db,'ACTUALIZAR','parada',id,usuario_id=u['sub'],valores_despues={'estado':'ATENDIDA','evidencia_id':e.id})
    return {'mensaje':'Entrega y fotografía registradas','evidencia_id':e.id}

@router.get('/paradas/{id}/evidencias')
async def evidencias(id:int,db:AsyncSession=Depends(get_db),u:dict=Depends(require_roles(['REPARTIDOR','ASISTENTE','JEFE']))):
    await parada_autorizada(db,id,u)
    return [dict(id=e.id,nombre=e.nombre_archivo,subido_en=e.subido_en) for e in (await db.scalars(select(EvidenciaEntrega).where(EvidenciaEntrega.parada_id==id))).all()]

@router.get('/paradas/{id}/evidencias/{evidencia_id}/archivo')
async def archivo_evidencia(id:int,evidencia_id:str,db:AsyncSession=Depends(get_db),u:dict=Depends(require_roles(['REPARTIDOR','ASISTENTE','JEFE']))):
    await parada_autorizada(db,id,u)
    e=await db.get(EvidenciaEntrega,evidencia_id)
    if not e or e.parada_id!=id:raise HTTPException(404,'Evidencia no encontrada')
    path=Path(settings.UPLOAD_DIR)/e.ruta_almacenamiento
    if not path.is_file():raise HTTPException(404,'Archivo no encontrado')
    return FileResponse(path,media_type=e.tipo_mime,filename=e.nombre_archivo)

@router.post('/paradas/{id}/incidencias',status_code=201)
async def incidencia(id:int,tipo:str=Form(...),descripcion:str=Form(...),db:AsyncSession=Depends(get_db),u:dict=Depends(repartidor)):
    parada,ruta=await parada_autorizada(db,id,u)
    tipos=['CLIENTE_CERRADO','CLIENTE_NO_RECIBE','DIRECCION_INCORRECTA','PEDIDO_RECHAZADO','VEHICULO_RETRASADO','OTRO']
    if tipo not in tipos or not descripcion.strip() or len(descripcion)>1000:raise HTTPException(422,'Tipo o descripción de incidencia inválidos')
    inc=Incidencia(id_parada=id,tipo=tipo,descripcion=descripcion.strip(),estado='ABIERTA',registrada_por=int(u['sub']))
    db.add(inc);await db.flush()
    await registrar_auditoria(db,'CREAR','incidencia',inc.id,usuario_id=u['sub'],valores_despues={'parada_id':id,'tipo':tipo,'descripcion':descripcion})
    return {'mensaje':'Incidencia registrada','incidencia_id':inc.id}
