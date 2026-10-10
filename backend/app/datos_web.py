"""Lectura integrada para las pantallas web. Los datos siempre proceden del ORM."""
from datetime import datetime, time, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.db import get_db
from backend.app.core.seguridad import obtener_usuario_actual, require_roles
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import (Usuario, Vehiculo, Cliente, Pedido, ReglaCliente, Ruta, ParadaRuta, Cobro, ComprobantePago, Incidencia, PlanificacionVersion, Planificacion)

router=APIRouter(prefix='/datos',tags=['Datos de las pantallas'])
COLORES=['#2563EB','#16A34A','#DC2626','#9333EA','#F59E0B']

def zona(distrito):
    if distrito in ['Los Olivos','Comas','Carabayllo','San Martín de Porres','Independencia']:return 'Norte'
    if distrito in ['San Juan de Lurigancho','Ate','Santa Anita']:return 'Este'
    if distrito in ['Chorrillos','Lurín','Villa El Salvador','Villa María del Triunfo']:return 'Sur'
    return 'Centro'

def horario(r):
    return f'{r.hora_inicio:%H:%M}–{r.hora_fin:%H:%M}' if r.hora_inicio and r.hora_fin else 'Todo el día'

def dias(r):
    if r.tipo_regla=='DIAS_DISPONIBLES':return [int(d) for d in r.valor.split(',')] if r.valor else []
    if r.tipo_regla=='DIA_NO_DISPONIBLE' and r.dia_semana is not None:return [d for d in range(7) if d!=r.dia_semana]
    return None

def vehiculo(v):
    return dict(id=v.id,id_vehiculo=v.id_vehiculo,codigo_externo=v.codigo_externo,placa=v.placa,marca=v.marca,modelo=v.modelo,conductor=v.conductor,pesoMax=v.pesoMax,volMax=v.volMax,capacidad_kg=float(v.capacidad_kg),capacidad_m3=float(v.capacidad_m3),estado=v.estado,activo=v.activo)

@router.get('')
async def cargar_datos(db:AsyncSession=Depends(get_db),token:dict=Depends(obtener_usuario_actual)):
    u=await db.get(Usuario,int(token['sub']))
    if not u or not u.activo:raise HTTPException(401,'La sesión ya no está activa')
    rol=u.rol
    clientes={c.id_cliente:c for c in (await db.execute(select(Cliente))).scalars()}
    vehiculos={v.id_vehiculo:v for v in (await db.execute(select(Vehiculo).order_by(Vehiculo.id_vehiculo))).scalars()}
    reglas=(await db.execute(select(ReglaCliente).where(ReglaCliente.activa==True).order_by(ReglaCliente.id_regla))).scalars().all()
    por_cliente={}
    for regla in reglas:por_cliente.setdefault(regla.id_cliente,[]).append(regla)
    pedidos={p.id_pedido:p for p in (await db.execute(select(Pedido).order_by(Pedido.id_pedido))).scalars()}
    def pedido(p):
        c=clientes[p.id_cliente];rs=por_cliente.get(c.id_cliente,[])
        ds=None;ventana='Todo el día'
        for r in rs:
            rd=dias(r)
            if rd is not None:ds=rd if ds is None else [d for d in ds if d in rd]
            if r.hora_inicio and r.hora_fin:ventana=horario(r)
        return dict(id=p.id,codigo_externo=p.codigo_externo,cliente=c.razon_social,cliente_id=c.id,dir=c.direccion,dist=c.distrito,zona=zona(c.distrito),lat=c.lat,lon=c.lon,peso=float(p.peso_kg),peso_kg=float(p.peso_kg),vol=float(p.volumen_m3),volumen_m3=float(p.volumen_m3),importe=float(p.importe),monto=float(p.importe),servicio=15,tiempo_servicio_min=15,bultos=1,prioridad='Media',ventana=ventana,dias=ds,estado=p.estado,fecha_corte=p.fecha_corte,habilitado=p.habilitado_despacho)
    rq=select(Ruta).join(PlanificacionVersion, Ruta.version_id==PlanificacionVersion.id).join(Planificacion, PlanificacionVersion.planificacion_id==Planificacion.id).where(PlanificacionVersion.estado=="CONFIRMADA", Planificacion.version_vigente==PlanificacionVersion.numero).order_by(Ruta.id_ruta)
    if rol=='REPARTIDOR':rq=rq.where(Ruta.id_repartidor==u.id_usuario)
    rutas=(await db.execute(rq)).scalars().all() if rol in ['JEFE','ASISTENTE','REPARTIDOR'] else []
    ruta_ids=[r.id_ruta for r in rutas]
    paradas=(await db.execute(select(ParadaRuta).where(ParadaRuta.id_ruta.in_(ruta_ids)).order_by(ParadaRuta.secuencia))).scalars().all() if ruta_ids else []
    usuarios={x.id_usuario:x for x in (await db.execute(select(Usuario))).scalars()}
    def ruta(r,i):
        ps=[]
        for par in paradas:
            if par.id_ruta!=r.id_ruta:continue
            info=pedido(pedidos[par.id_pedido]);info.update(id=par.id,pedido_id=str(par.id_pedido),id_parada=par.id_parada,id_ruta=r.id_ruta,id_pedido=par.id_pedido,secuencia=par.secuencia,orden=par.secuencia,estado={'ATENDIDA':'entregado','EN_CAMINO':'en_camino'}.get(par.estado,'pendiente'),estado_db=par.estado,bloqueado=par.bloqueada_manual,horaReal=par.hora_llegada_real.strftime('%H:%M') if par.hora_llegada_real else None,eta_estimada=par.eta_estimada.isoformat() if par.eta_estimada else None)
            ps.append(info)
        v=vehiculo(vehiculos[r.id_vehiculo]);rep=usuarios.get(r.id_repartidor)
        if rep:v['conductor']=f'{rep.nombres} {rep.apellidos}'
        return dict(id=r.id,id_ruta=r.id_ruta,vehiculo=v,color=COLORES[i%len(COLORES)],estado='en_ruta',estado_db=r.estado,fecha_ruta=r.fecha_ruta.isoformat(),horaInicio='08:00',distancia_total_km=float(r.distancia_total_km),tiempo_estimado_min=r.tiempo_estimado_min,paradas=ps)
    cobros=[]
    if rol in ['TESORERIA','REPARTIDOR','JEFE','ADMINISTRADOR']:
        cq=select(Cobro).order_by(Cobro.fecha_registro)
        if rol=='REPARTIDOR':cq=cq.where(Cobro.registrado_por==u.id_usuario)
        cs=(await db.execute(cq)).scalars().all()
        comprobantes={x.cobro_id:x for x in (await db.execute(select(ComprobantePago).where(ComprobantePago.vigente==True))).scalars()}
        paradas_cobro={p.id_parada:p for p in (await db.scalars(select(ParadaRuta).where(ParadaRuta.id_parada.in_([c.parada_id for c in cs if c.parada_id])))).all()}
        for c in cs:
            p=pedidos.get(c.pedido_id)
            if not p:continue
            cli=clientes[p.id_cliente];rep=usuarios.get(c.registrado_por)
            cobros.append(dict(id=c.id,pedido=p.codigo_externo,pedido_id=p.id,cliente=cli.razon_social,conductor=f'{rep.nombres} {rep.apellidos}' if rep else 'Sin asignar',ruta=str(paradas_cobro[c.parada_id].id_ruta) if c.parada_id in paradas_cobro else '—',color=COLORES[0],monto=float(c.monto_cobrado),tipo=c.metodo_pago.lower(),hora=c.fecha_registro.astimezone(timezone(timedelta(hours=-5))).strftime('%H:%M'),estado={'CONFORME':'validado','VALIDADO':'validado','OBSERVADO':'rechazado','RECHAZADO':'rechazado'}.get(c.estado,'pendiente'),estado_db=c.estado,nota=c.nota or '',comprobante=c.id in comprobantes,numero_operacion=c.numero_operacion))
    incidencias=[]
    if ruta_ids:
        parada_ids=[p.id_parada for p in paradas]
        incidencias=[dict(id=x.id,id_parada=x.id_parada,id_ruta=next(p.id_ruta for p in paradas if p.id_parada==x.id_parada),tipo=x.tipo,descripcion=x.descripcion,estado=x.estado) for x in (await db.execute(select(Incidencia).where(Incidencia.id_parada.in_(parada_ids)))).scalars()]
    permitidos={p.id_pedido for p in paradas}
    return dict(clientes=[dict(id=c.id,nombre=c.razon_social) for c in clientes.values()] if rol in ["JEFE","ASISTENTE"] else [],vehiculos=[vehiculo(v) for v in vehiculos.values()] if rol in ['JEFE','ASISTENTE'] else [],pedidos=[pedido(p) for p in pedidos.values() if rol!='ADMINISTRADOR' and (rol!='REPARTIDOR' or p.id_pedido in permitidos)],reglas=[dict(activa=r.activa,id=r.id,cliente_id=str(r.id_cliente),cliente=clientes[r.id_cliente].razon_social,pedidoRef='—',ventana=horario(r),dias=dias(r),zona=zona(clientes[r.id_cliente].distrito)) for r in reglas] if rol in ['JEFE','ASISTENTE'] else [],rutas=[ruta(r,i) for i,r in enumerate(rutas)],cobros=cobros,incidencias=incidencias)

class VehiculoSave(BaseModel):
    pesoMax:float=Field(gt=0)
    volMax:float=Field(gt=0)
    conductor:str
    estado:str

@router.put('/vehiculos/{id}')
async def guardar_vehiculo(id:int,req:VehiculoSave,db:AsyncSession=Depends(get_db),u:dict=Depends(require_roles(['JEFE','ASISTENTE']))):
    v=await db.get(Vehiculo,id)
    if not v:raise HTTPException(404,'Vehículo no encontrado')
    if req.estado not in ['DISPONIBLE','ASIGNADO','MANTENIMIENTO','INACTIVO']:raise HTTPException(422,'Estado inválido')
    v.capacidad_kg=req.pesoMax*1000;v.capacidad_m3=req.volMax;v.conductor=req.conductor;v.estado=req.estado;v.activo=req.estado in ['DISPONIBLE','ASIGNADO']
    await registrar_auditoria(db,accion='ACTUALIZAR',entidad='vehiculo',entidad_id=id,usuario_id=u['sub'],valores_despues=req.model_dump())
    return {'estado':'GUARDADO'}

class ReglaSave(BaseModel):
    cliente_id:int
    dias:list[int]|None=None
    ventana:str='Todo el día'

@router.put('/reglas/{id}')
async def guardar_regla(id:int,req:ReglaSave,db:AsyncSession=Depends(get_db),u:dict=Depends(require_roles(['JEFE','ASISTENTE']))):
    r=await db.get(ReglaCliente,id)
    if not r or r.id_cliente!=req.cliente_id:raise HTTPException(404,'Regla no encontrada para el cliente')
    if req.dias is not None and any(d not in range(7) for d in req.dias):raise HTTPException(422,'Días inválidos')
    inicio=fin=None
    if req.ventana!='Todo el día':
        try:
            a,b=req.ventana.replace('–','-').split('-');inicio=time.fromisoformat(a);fin=time.fromisoformat(b)
            if inicio>=fin:raise ValueError()
        except ValueError:raise HTTPException(422,'Intervalo horario inválido')
    r.tipo_regla='DIAS_DISPONIBLES' if req.dias is not None else 'VENTANA_HORARIA';r.valor=','.join(map(str,req.dias)) if req.dias is not None else None;r.hora_inicio=inicio;r.hora_fin=fin
    await registrar_auditoria(db,accion='ACTUALIZAR',entidad='regla_cliente',entidad_id=id,usuario_id=u['sub'],valores_despues=req.model_dump())
    return {'estado':'GUARDADO'}

@router.post('/reglas/{id}/desactivar')
async def desactivar_regla(id:int,db:AsyncSession=Depends(get_db),u:dict=Depends(require_roles(['JEFE','ASISTENTE']))):
    r=await db.get(ReglaCliente,id)
    if not r:raise HTTPException(404,'Regla no encontrada')
    r.activa=False
    await registrar_auditoria(db,accion='ACTUALIZAR',entidad='regla_cliente',entidad_id=id,usuario_id=u['sub'],valores_despues={'activa':False})
    return {'estado':'DESACTIVADA'}
class ParadaSave(BaseModel):
    id:int
    secuencia:int=Field(gt=0)
    bloqueado:bool=False

class RutaSave(BaseModel):
    paradas:list[ParadaSave]

@router.put('/rutas/{id}')
async def guardar_ruta(id:int,req:RutaSave,db:AsyncSession=Depends(get_db),u:dict=Depends(require_roles(['JEFE','ASISTENTE']))):
    ruta=await db.get(Ruta,id)
    if not ruta:raise HTTPException(404,'Ruta no encontrada')
    version=await db.get(PlanificacionVersion,ruta.version_id) if ruta.version_id else None
    if not version or version.estado!='BORRADOR':raise HTTPException(409,'La planificación confirmada se conserva sin modificaciones')
    ps=(await db.execute(select(ParadaRuta).where(ParadaRuta.id_ruta==id))).scalars().all()
    changes={p.id:p for p in req.paradas}
    if len(changes)!=len(req.paradas) or set(changes)!={p.id_parada for p in ps} or sorted(p.secuencia for p in req.paradas)!=list(range(1,len(ps)+1)):
        raise HTTPException(422,'La secuencia debe incluir todas las paradas de la ruta, sin duplicados')
    for p in ps:
        item=changes[p.id_parada]
        if p.estado=='ATENDIDA' and (p.secuencia!=item.secuencia or p.bloqueada_manual!=item.bloqueado):raise HTTPException(409,'No se pueden cambiar las paradas ya entregadas')
        p.secuencia=item.secuencia;p.bloqueada_manual=item.bloqueado
    await registrar_auditoria(db,accion='ACTUALIZAR',entidad='ruta',entidad_id=id,usuario_id=u['sub'],valores_despues=req.model_dump())
    return {'estado':'GUARDADO'}

@router.post('/reglas',status_code=201)
async def crear_regla(req:ReglaSave,db:AsyncSession=Depends(get_db),u:dict=Depends(require_roles(['JEFE','ASISTENTE']))):
    if not await db.get(Cliente,req.cliente_id):raise HTTPException(404,'Cliente no encontrado')
    regla=ReglaCliente(id_cliente=req.cliente_id,tipo_regla='VENTANA_HORARIA',activa=True,es_restriccion_dura=True)
    db.add(regla);await db.flush()
    await guardar_regla(regla.id_regla,req,db,u)
    return {'id':regla.id}


@router.get('/reglas')
async def consultar_reglas(cliente_id:int|None=None,incluir_inactivas:bool=False,db:AsyncSession=Depends(get_db),u:dict=Depends(require_roles(['JEFE','ASISTENTE']))):
    query=select(ReglaCliente,Cliente).join(Cliente,ReglaCliente.id_cliente==Cliente.id_cliente).order_by(ReglaCliente.id_regla)
    if cliente_id:query=query.where(ReglaCliente.id_cliente==cliente_id)
    if not incluir_inactivas:query=query.where(ReglaCliente.activa==True)
    return [dict(id=r.id,cliente_id=c.id,cliente=c.nombre,activa=r.activa,dias=dias(r),ventana=horario(r),tipo=r.tipo_regla) for r,c in (await db.execute(query)).all()]
