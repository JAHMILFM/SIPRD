from datetime import date, datetime
from fastapi import APIRouter, Depends, status, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Planificacion, Ruta, ParadaRuta, Pedido, Vehiculo, Cliente
from motor.motor.modelos import InstanciaVRP, Punto, VehiculoVRP
from motor.motor.planificador import optimizar_vrp

router = APIRouter(prefix="/planificaciones", tags=["Planificación de rutas"])
class CrearPlanificacionRequest(BaseModel):
    fecha: str
    vehiculo_ids: List[int]
    parametros: Optional[Dict[str,Any]] = None

def fecha_valor(v:str)->date: return datetime.strptime(v,"%d/%m/%Y").date() if "/" in v else date.fromisoformat(v)

@router.post("",status_code=status.HTTP_201_CREATED)
async def crear_planificacion(req:CrearPlanificacionRequest,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
    fecha=fecha_valor(req.fecha)
    vehiculos=(await db.execute(select(Vehiculo).where(Vehiculo.id_vehiculo.in_(req.vehiculo_ids),Vehiculo.activo==True,Vehiculo.estado_operativo=="DISPONIBLE"))).scalars().all()
    if not vehiculos: raise ErrorReglaNegocio("SIN_VEHICULOS","Seleccione vehículos disponibles.")
    filas=(await db.execute(select(Pedido,Cliente).join(Cliente,Pedido.id_cliente==Cliente.id_cliente).where(Pedido.fecha_programada==fecha,Pedido.estado=="PENDIENTE",Pedido.habilitado_despacho==True))).all()
    if not filas: raise ErrorReglaNegocio("SIN_PEDIDOS","No hay pedidos pendientes para la fecha indicada.")
    puntos=[Punto(id=str(p.id_pedido),nombre=c.razon_social,lat=float(c.latitud or -12.0464),lon=float(c.longitud or -77.0428),peso_kg=float(p.peso_kg),volumen_m3=float(p.volumen_m3)) for p,c in filas]
    flota=[VehiculoVRP(id=str(v.id_vehiculo),placa=v.placa,capacidad_peso_kg=float(v.capacidad_kg),capacidad_volumen_m3=float(v.capacidad_m3)) for v in vehiculos]
    solucion=optimizar_vrp(InstanciaVRP(fecha=fecha.isoformat(),deposito=Punto(id="ALMACEN",nombre="Almacén Lurín",lat=-12.2748,lon=-76.8711),pedidos=puntos,vehiculos=flota),metodo="HIBRIDO")
    anterior=(await db.execute(select(Planificacion).where(Planificacion.fecha_operacion==fecha).order_by(Planificacion.numero_version.desc()))).scalars().first()
    plan=Planificacion(id_planificacion_anterior=anterior.id_planificacion if anterior else None,fecha_operacion=fecha,numero_version=(anterior.numero_version+1 if anterior else 1),algoritmo=solucion.metodo,estado="GENERADA",id_usuario_creador=int(usuario["sub"]))
    if anterior: anterior.estado="REPLANIFICADA"
    db.add(plan); await db.flush()
    for resultado in solucion.rutas:
        ruta=Ruta(id_planificacion=plan.id_planificacion,id_vehiculo=int(resultado.vehiculo_id),estado="GENERADA",distancia_total_km=resultado.distancia_total_km,tiempo_estimado_min=round(resultado.duracion_total_min))
        db.add(ruta); await db.flush()
        for p in resultado.paradas:
            db.add(ParadaRuta(id_ruta=ruta.id_ruta,id_pedido=int(p.pedido_id),secuencia=p.secuencia,distancia_anterior_km=0,tiempo_servicio_min=15,estado="PENDIENTE"))
    await registrar_auditoria(db,"CREAR" if not anterior else "REPLANIFICAR","planificacion",plan.id_planificacion,valores_despues={"rutas":len(solucion.rutas),"no_asignados":len(solucion.no_asignados)},usuario_id=usuario["sub"])
    await db.commit()
    return {"planificacion_id":plan.id_planificacion,"numero_version":plan.numero_version,"estado":plan.estado,"no_asignados":[x.model_dump() for x in solucion.no_asignados]}

@router.get("")
async def listar_planificaciones(fecha:Optional[str]=Query(None),db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
    q=select(Planificacion)
    if fecha:q=q.where(Planificacion.fecha_operacion==fecha_valor(fecha))
    return [{"id":p.id_planificacion,"fecha":p.fecha_operacion,"numero_version":p.numero_version,"estado":p.estado,"algoritmo":p.algoritmo,"creado_en":p.fecha_creacion} for p in (await db.execute(q.order_by(Planificacion.fecha_creacion.desc()))).scalars()]

@router.get("/{planificacion_id}")
async def obtener_planificacion(planificacion_id:int,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR","REPARTIDOR"]))):
    plan=await db.get(Planificacion,planificacion_id)
    if not plan:raise ErrorNoEncontrado("Planificacion",planificacion_id)
    rutas=(await db.execute(select(Ruta,Vehiculo).join(Vehiculo,Ruta.id_vehiculo==Vehiculo.id_vehiculo).where(Ruta.id_planificacion==planificacion_id))).all(); data=[]
    for ruta,vehiculo in rutas:
        stops=(await db.execute(select(ParadaRuta,Pedido,Cliente).join(Pedido,ParadaRuta.id_pedido==Pedido.id_pedido).join(Cliente,Pedido.id_cliente==Cliente.id_cliente).where(ParadaRuta.id_ruta==ruta.id_ruta).order_by(ParadaRuta.secuencia))).all()
        data.append({"id":ruta.id_ruta,"vehiculo":{"id":vehiculo.id_vehiculo,"placa":vehiculo.placa},"estado":ruta.estado,"distancia_total_km":float(ruta.distancia_total_km),"tiempo_estimado_min":ruta.tiempo_estimado_min,"paradas":[{"id":s.id_parada,"secuencia":s.secuencia,"pedido_id":p.id_pedido,"codigo_externo":p.codigo_externo,"cliente":c.razon_social,"direccion":c.direccion,"estado":s.estado,"eta":s.eta_estimada} for s,p,c in stops]})
    return {"id":plan.id_planificacion,"fecha":plan.fecha_operacion,"numero_version":plan.numero_version,"estado":plan.estado,"rutas":data}

@router.post("/{planificacion_id}/confirmar")
async def confirmar_planificacion(planificacion_id:int,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ASISTENTE","JEFE","ADMINISTRADOR"]))):
    plan=await db.get(Planificacion,planificacion_id)
    if not plan:raise ErrorNoEncontrado("Planificacion",planificacion_id)
    if plan.estado=="CONFIRMADA":return {"mensaje":"Planificación ya confirmada"}
    rutas=(await db.execute(select(Ruta).where(Ruta.id_planificacion==planificacion_id))).scalars().all()
    if not rutas:raise ErrorReglaNegocio("SIN_RUTAS","No se puede confirmar una planificación sin rutas.")
    for ruta in rutas:
        ruta.estado="CONFIRMADA"
        for parada in (await db.execute(select(ParadaRuta).where(ParadaRuta.id_ruta==ruta.id_ruta))).scalars():
            pedido=await db.get(Pedido,parada.id_pedido); pedido.estado="PLANIFICADO"
    plan.estado="CONFIRMADA"; plan.id_usuario_confirmador=int(usuario["sub"]); plan.fecha_confirmacion=datetime.now()
    await registrar_auditoria(db,"CONFIRMAR","planificacion",planificacion_id,valores_despues={"estado":"CONFIRMADA"},usuario_id=usuario["sub"]); await db.commit(); return {"mensaje":"Planificación confirmada"}
