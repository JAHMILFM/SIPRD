from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.tiempo import ahora
from backend.app.models import (
    Planificacion, PlanificacionVersion, Ruta, Parada, PedidoNoAsignado,
    Pedido, Vehiculo, Cliente, Usuario, ReglaCliente
)
from motor.motor.modelos import InstanciaVRP, Punto, VehiculoVRP
from motor.motor.planificador import optimizar_vrp
from motor.motor.evaluador import evaluar_rutas_manuales
from motor.motor.replanificador import replanificar_operacion

router = APIRouter(prefix="/planificaciones", tags=["Planificación de Rutas"])

class CrearPlanificacionRequest(BaseModel):
    fecha: str = "27/08/2026"
    vehiculo_ids: List[int]
    parametros: Optional[Dict[str, Any]] = None

@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_planificacion(
    req: CrearPlanificacionRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"]))
):
    return await generar_propuesta(req, db, usuario)

async def generar_propuesta(req, db, usuario, plan_existente=None, numero=1, pedidos_adicionales=None):
    """
    Genera propuesta de ruteo automático con el motor híbrido (RF-PLAN-01).
    Crea la versión 1 en estado BORRADOR.
    """
    try:
        fecha_ruta = datetime.strptime(req.fecha, "%d/%m/%Y").date()
    except ValueError:
        raise HTTPException(422, "Fecha inválida; use DD/MM/AAAA")
    # 1. Obtener vehículos solicitados
    v_q = await db.execute(select(Vehiculo).where(Vehiculo.id.in_(req.vehiculo_ids), Vehiculo.activo == True, Vehiculo.estado.in_(["DISPONIBLE", "ASIGNADO"])))
    vehiculos_db = v_q.scalars().all()
    if len(vehiculos_db) != len(set(req.vehiculo_ids)):
        raise ErrorReglaNegocio("SIN_VEHICULOS", "No se encontraron vehículos operativos seleccionados")

    # 2. Obtener pedidos pendientes para la fecha
    p_q = await db.execute(
        select(Pedido, Cliente)
        .join(Cliente, Pedido.cliente_id == Cliente.id)
        .where(Pedido.fecha_programada == fecha_ruta, ((Pedido.estado == "PENDIENTE") | Pedido.id_pedido.in_(pedidos_adicionales or [])), Pedido.habilitado_despacho == True)
    )
    pedidos_filas = p_q.all()
    if not pedidos_filas:
        raise ErrorReglaNegocio("SIN_PEDIDOS", "No hay pedidos pendientes para la fecha solicitada")

    # Punto depósito (Lurín por defecto)
    deposito = Punto(
        id="DEPOT",
        nombre="Almacén Lurín",
        lat=-12.2748,
        lon=-76.8711,
        tiempo_servicio_min=0
    )

    vrp_pedidos = await puntos_con_reglas(db, [p for p,c in pedidos_filas])

    vrp_vehiculos = [
        VehiculoVRP(
            id=v.id,
            placa=v.placa,
            capacidad_peso_kg=v.capacidad_peso_kg,
            capacidad_volumen_m3=v.capacidad_volumen_m3,
            inicio_jornada=v.inicio_jornada,
            fin_jornada=v.fin_jornada
        )
        for v in vehiculos_db
    ]

    instancia = InstanciaVRP(
        fecha=req.fecha,
        deposito=deposito,
        pedidos=vrp_pedidos,
        vehiculos=vrp_vehiculos
    )

    solucion = optimizar_vrp(instancia, metodo="HIBRIDO")

    # 3. Guardar Planificación y Versión 1 en base de datos
    plan = plan_existente or Planificacion(
        fecha=req.fecha,
        version_vigente=1,
        creada_por=str(usuario["sub"])
    )
    db.add(plan)
    await db.flush()

    resumen_data = {
        "total_distancia_km": solucion.total_distancia_km,
        "total_duracion_min": solucion.total_duracion_min,
        "total_pedidos_asignados": solucion.total_pedidos_asignados,
        "total_no_asignados": len(solucion.no_asignados),
        "total_rutas": len(solucion.rutas)
    }

    version = PlanificacionVersion(
        planificacion_id=plan.id,
        numero=numero,
        estado="BORRADOR",
        motivo=(req.parametros or {}).get("motivo_reoptimizacion", "Planificación inicial generada por el motor"),
        parametros=req.parametros or {},
        resumen=resumen_data,
        metodo=solucion.metodo,
        creada_por=str(usuario["sub"])
    )
    db.add(version)
    await db.flush()

    # Guardar rutas y paradas
    for r_res in solucion.rutas:
        nueva_ruta = Ruta(
            version_id=version.id,
            fecha_ruta=fecha_ruta,
            vehiculo_id=r_res.vehiculo_id,
            salida=r_res.salida_almacen,
            regreso=r_res.regreso_almacen,
            distancia_km=r_res.distancia_total_km,
            duracion_min=r_res.duracion_total_min,
            peso_kg=r_res.peso_total_kg,
            volumen_m3=r_res.volumen_total_m3
        )
        db.add(nueva_ruta)
        await db.flush()

        for p_res in r_res.paradas:
            parada = Parada(
                ruta_id=nueva_ruta.id,
                pedido_id=p_res.pedido_id,
                secuencia=p_res.secuencia,
                eta_estimada=datetime.combine(fecha_ruta, datetime.strptime(p_res.llegada, "%H:%M").time()),
                inicio_atencion=p_res.inicio_atencion,
                salida=p_res.salida,
                espera_min=p_res.espera_min,
                estado="PENDIENTE"
            )
            db.add(parada)

    # Guardar no asignados
    for na in solucion.no_asignados:
        no_asig = PedidoNoAsignado(
            version_id=version.id,
            pedido_id=na.pedido_id,
            codigo=na.codigo,
            motivo=na.motivo
        )
        db.add(no_asig)

    await registrar_auditoria(
        db=db,
        accion="GENERAR_PLANIFICACION",
        entidad="planificacion",
        entidad_id=plan.id,
        valores_despues={"version": numero, "rutas": len(solucion.rutas)},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {
        "planificacion_id": plan.id,
        "version_numero": numero,
        "estado": "BORRADOR",
        "resumen": resumen_data,
        "solucion": solucion.model_dump()
    }

@router.get("", response_model=List[dict])
async def listar_planificaciones(
    fecha: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"]))
):
    query = select(Planificacion)
    if fecha:
        query = query.where(Planificacion.fecha == fecha)
    result = await db.execute(query.order_by(Planificacion.creado_en.desc()))
    planes = result.scalars().all()
    return [
        {
            "id": p.id,
            "fecha": p.fecha,
            "version_vigente": p.version_vigente,
            "ultima_version": await db.scalar(select(func.max(PlanificacionVersion.numero)).where(PlanificacionVersion.planificacion_id==p.id)),
            "creado_en": p.creado_en
        }
        for p in planes
    ]

@router.get("/{id}/versiones/{n}")
async def obtener_version_plan(
    id: str,
    n: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"]))
):
    v_q = await db.execute(
        select(PlanificacionVersion).where(
            PlanificacionVersion.planificacion_id == id,
            PlanificacionVersion.numero == n
        ).with_for_update().execution_options(populate_existing=True)
    )
    version = v_q.scalars().first()
    if not version:
        raise ErrorNoEncontrado("PlanificacionVersion", f"{id} v{n}")

    # Rutas con paradas y detalles
    r_q = await db.execute(
        select(Ruta, Vehiculo).options(selectinload(Ruta.paradas).selectinload(Parada.pedido_rel))
        .join(Vehiculo, Ruta.vehiculo_id == Vehiculo.id)
        .where(Ruta.version_id == version.id)
    )
    rutas_filas = r_q.all()

    reglas_vigentes=(await db.scalars(select(ReglaCliente).where(ReglaCliente.activa==True))).all()
    rutas_resultado = []
    for r, v in rutas_filas:
        p_q = await db.execute(
            select(Parada, Pedido, Cliente)
            .join(Pedido, Parada.pedido_id == Pedido.id)
            .join(Cliente, Pedido.cliente_id == Cliente.id)
            .where(Parada.ruta_id == r.id)
            .order_by(Parada.secuencia)
        )
        paradas_filas = p_q.all()

        paradas_formato = [
            {
                "id": parada.id,
                "secuencia": parada.secuencia,
                "pedido_id": ped.id,
                "codigo_externo": ped.codigo_externo,
                "cliente": cli.nombre,
                "direccion": cli.direccion,
                "distrito": cli.distrito,
                "lat": cli.lat,
                "lon": cli.lon,
                "peso_kg": ped.peso_kg,
                "volumen_m3": ped.volumen_m3,
                "llegada": parada.llegada,
                "salida": parada.salida,
                "espera_min": parada.espera_min,
                "estado": parada.estado,
                "restricciones": [dict(tipo=x.tipo_regla,dias=x.valor,dia_no_disponible=x.dia_semana,inicio=x.hora_inicio,fin=x.hora_fin) for x in reglas_vigentes if x.id_cliente==ped.id_cliente]
            }
            for parada, ped, cli in paradas_filas
        ]

        rutas_resultado.append({
            "id": r.id,
            "ruta_id": r.id,
            "vehiculo": {
                "id": v.id,
                "placa": v.placa,
                "conductor": v.conductor,
                "capacidad_peso_kg": v.capacidad_peso_kg,
                "capacidad_volumen_m3": v.capacidad_volumen_m3
            },
            "repartidor_id": r.repartidor_id,
            "salida": r.salida,
            "regreso": r.regreso,
            "distancia_km": r.distancia_km,
            "duracion_min": r.duracion_min,
            "peso_kg": r.peso_kg,
            "volumen_m3": r.volumen_m3,
            "paradas": paradas_formato
        })

    # No asignados
    na_q = await db.execute(
        select(PedidoNoAsignado, Pedido, Cliente)
        .join(Pedido, PedidoNoAsignado.pedido_id == Pedido.id)
        .join(Cliente, Pedido.cliente_id == Cliente.id)
        .where(PedidoNoAsignado.version_id == version.id)
    )
    no_asig_filas = na_q.all()
    no_asignados_data = [
        {
            "pedido_id": p.id,
            "codigo_externo": p.codigo_externo,
            "cliente": c.nombre,
            "peso_kg": p.peso_kg,
            "volumen_m3": p.volumen_m3,
            "codigo": na.codigo,
            "motivo": na.motivo
        }
        for na, p, c in no_asig_filas
    ]

    return {
        "version_id": version.id,
        "numero": version.numero,
        "estado": version.estado,
        "motivo": version.motivo,
        "resumen": version.resumen,
        "rutas": rutas_resultado,
        "no_asignados": no_asignados_data
    }

@router.put("/{id}/versiones/{n}/rutas/{ruta_id}/repartidor")
async def asignar_repartidor(
    id: str,
    n: int,
    ruta_id: str,
    req: Dict[str, int],
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"]))
):
    ruta = await db.get(Ruta, ruta_id)
    if not ruta:
        raise ErrorNoEncontrado("Ruta", ruta_id)
    
    v=await db.scalar(select(PlanificacionVersion).where(PlanificacionVersion.planificacion_id==id,PlanificacionVersion.numero==n))
    if not v or ruta.version_id!=v.id:raise HTTPException(404,"La ruta no pertenece a esta versión")
    if v.estado!="BORRADOR":raise HTTPException(409,"La versión confirmada no se puede editar")
    repartidor_id = req.get("repartidor_id")
    rep=await db.get(Usuario,repartidor_id) if repartidor_id else None
    if not rep or not rep.activo or rep.rol!="REPARTIDOR":raise HTTPException(422,"Selecciona un repartidor activo")
    ruta.repartidor_id = repartidor_id
    await registrar_auditoria(db,"ACTUALIZAR","ruta",ruta.id,usuario_id=usuario["sub"],valores_despues={"repartidor_id":repartidor_id})
    await db.commit()
    return {"mensaje": "Repartidor asignado exitosamente"}

@router.post("/{id}/versiones/{n}/confirmar")
async def confirmar_version(
    id: str,
    n: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"])) # Solo Jefe o Admin confirma
):
    """
    Confirma formalmente una versión de planificación (RF-PLAN-04 / RN-PLAN-02).
    - Exige que todas las rutas tengan repartidor asignado.
    - Cambia estado a CONFIRMADA.
    - Cambia los pedidos asociados a PLANIFICADO.
    - Una versión CONFIRMADA nunca más se edita.
    """
    plan_bloqueado = await db.scalar(select(Planificacion).where(Planificacion.id==id).with_for_update().execution_options(populate_existing=True))
    if not plan_bloqueado: raise HTTPException(404, 'Planificación no encontrada')
    v_q = await db.execute(
        select(PlanificacionVersion).where(
            PlanificacionVersion.planificacion_id == id,
            PlanificacionVersion.numero == n
        ).with_for_update().execution_options(populate_existing=True)
    )
    version = v_q.scalars().first()
    if not version:
        raise ErrorNoEncontrado("PlanificacionVersion", f"{id} v{n}")

    if version.estado == "CONFIRMADA":
        return {"mensaje": "La versión ya se encuentra confirmada"}

    if version.estado != "BORRADOR":raise HTTPException(409,"La versión no es un borrador")
    version_origen = (version.parametros or {}).get('version_origen')
    anterior = None
    if version_origen:
        if plan_bloqueado.version_vigente != version_origen: raise HTTPException(409, 'La versión vigente cambió; genera una propuesta actualizada')
        anterior = await db.scalar(select(PlanificacionVersion).where(PlanificacionVersion.planificacion_id==id,PlanificacionVersion.numero==version_origen))
        await asegurar_sin_ejecucion(db, anterior)

    # Validar que todas las rutas tengan repartidor
    r_q = await db.execute(select(Ruta).where(Ruta.version_id == version.id))
    rutas = r_q.scalars().all()
    if not rutas:raise HTTPException(409,"No se puede confirmar una propuesta sin rutas")
    await validar_propuesta(db,version,rutas)
    rutas_sin_repartidor = [r for r in rutas if not r.repartidor_id]
    if rutas_sin_repartidor:
        raise ErrorReglaNegocio(
            "REPARTIDOR_REQUERIDO",
            f"No se puede confirmar el plan. Hay {len(rutas_sin_repartidor)} ruta(s) sin repartidor asignado."
        )

    # Bloquear la versión y los pedidos impide confirmar simultáneamente dos despachos.
    await db.execute(select(PlanificacionVersion).where(PlanificacionVersion.id==version.id).with_for_update())
    # Actualizar estado de pedidos a PLANIFICADO
    for r in rutas:
        p_q = await db.execute(select(Parada).where(Parada.ruta_id == r.id))
        paradas = p_q.scalars().all()
        for par in paradas:
            ped = await db.scalar(select(Pedido).where(Pedido.id_pedido==par.id_pedido).with_for_update().execution_options(populate_existing=True))
            if ped:
                otro=await db.scalar(select(Parada.id_parada).join(Ruta,Parada.id_ruta==Ruta.id_ruta).join(PlanificacionVersion,Ruta.version_id==PlanificacionVersion.id).where(Parada.id_pedido==ped.id_pedido,PlanificacionVersion.estado=="CONFIRMADA",PlanificacionVersion.id!=version.id,PlanificacionVersion.planificacion_id!=id).limit(1))
                if otro or ped.estado not in (["PENDIENTE", "PLANIFICADO"] if version_origen else ["PENDIENTE"]):raise HTTPException(409,f"El pedido {ped.codigo_externo} ya fue asignado o finalizado")
                ped.estado = "PLANIFICADO"
                ped.id_vehiculo = r.id_vehiculo

    if anterior:
        anteriores = set((await db.scalars(select(Parada.id_pedido).join(Ruta, Parada.id_ruta==Ruta.id_ruta).where(Ruta.version_id==anterior.id))).all())
        nuevos = set((await db.scalars(select(Parada.id_pedido).join(Ruta, Parada.id_ruta==Ruta.id_ruta).where(Ruta.version_id==version.id))).all())
        for ped in (await db.scalars(select(Pedido).where(Pedido.id_pedido.in_(anteriores-nuevos)))).all():
            ped.estado='PENDIENTE'; ped.id_vehiculo=None
        anterior.estado='SUPERADA'
    version.estado = "CONFIRMADA"
    version.confirmada_por = str(usuario["sub"])
    version.confirmada_en = ahora()

    # Actualizar versión vigente en la cabecera
    plan = await db.get(Planificacion, id)
    if plan:
        plan.version_vigente = version.numero

    await registrar_auditoria(
        db=db,
        accion="CONFIRMAR_PLANIFICACION",
        entidad="planificacion_version",
        entidad_id=version.id,
        valores_despues={"estado": "CONFIRMADA", "version": version.numero},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {"mensaje": f"Planificación versión {n} confirmada exitosamente"}


async def puntos_con_reglas(db,pedidos):
    clientes={c.id_cliente:c for c in (await db.scalars(select(Cliente))).all()}
    reglas=(await db.scalars(select(ReglaCliente).where(ReglaCliente.activa==True))).all()
    ps=[]
    for p in pedidos:
        c=clientes[p.id_cliente];ds=set(range(7));inicio=None;fin=None
        for r in reglas:
            if r.id_cliente!=p.id_cliente:continue
            if r.tipo_regla=='DIAS_DISPONIBLES':ds&={int(x) for x in r.valor.split(',')} if r.valor else set()
            if r.tipo_regla=='DIA_NO_DISPONIBLE' and r.dia_semana is not None:ds.discard(r.dia_semana)
            if r.hora_inicio:inicio=max(inicio,r.hora_inicio) if inicio else r.hora_inicio
            if r.hora_fin:fin=min(fin,r.hora_fin) if fin else r.hora_fin
        ps.append(Punto(id=p.id,nombre=c.nombre,lat=c.lat,lon=c.lon,peso_kg=float(p.peso_kg),volumen_m3=float(p.volumen_m3),tiempo_servicio_min=p.tiempo_servicio_min,
            dias_permitidos=sorted(ds),ventana_inicio=inicio.strftime('%H:%M') if inicio else None,ventana_fin=fin.strftime('%H:%M') if fin else None))
    return ps

async def validar_propuesta(db,version,rutas):
    plan=await db.get(Planificacion,version.planificacion_id)
    fecha=datetime.strptime(plan.fecha,'%d/%m/%Y').date();dia=(fecha.weekday()+1)%7
    paradas=(await db.scalars(select(Parada).where(Parada.id_ruta.in_([r.id_ruta for r in rutas])).order_by(Parada.secuencia))).all()
    ids=[p.id_pedido for p in paradas]
    if not ids or len(ids)!=len(set(ids)):raise HTTPException(409,"La propuesta está vacía o repite pedidos")
    pedidos=(await db.scalars(select(Pedido).where(Pedido.id_pedido.in_(ids)))).all()
    puntos=await puntos_con_reglas(db,pedidos)
    if any(dia not in p.dias_permitidos or (p.ventana_inicio and p.ventana_fin and p.ventana_inicio>=p.ventana_fin) for p in puntos):
        raise HTTPException(409,"Una regla de atención impide confirmar esta propuesta. Genera otra con las reglas actuales.")
    vehiculos=[];raw=[]
    for ruta in rutas:
        v=await db.get(Vehiculo,ruta.id_vehiculo)
        if not v or not v.activo or v.estado not in ['DISPONIBLE','ASIGNADO']:raise HTTPException(409,"Vehículo fuera de servicio")
        if ruta.id_repartidor:
            rep=await db.get(Usuario,ruta.id_repartidor)
            if not rep or not rep.activo or rep.rol!='REPARTIDOR':raise HTTPException(409,"Repartidor inactivo o inválido")
        vehiculos.append(VehiculoVRP(id=v.id,placa=v.placa,capacidad_peso_kg=v.capacidad_peso_kg,capacidad_volumen_m3=v.capacidad_volumen_m3,inicio_jornada=v.inicio_jornada,fin_jornada=v.fin_jornada))
        raw.append(dict(vehiculo_id=v.id,pedidos_ids=[str(p.id_pedido) for p in paradas if p.id_ruta==ruta.id_ruta]))
    result=evaluar_rutas_manuales(Punto(id='DEPOT',lat=-12.2748,lon=-76.8711,tiempo_servicio_min=0),raw,vehiculos,puntos,velocidad_kmh=20)
    if not result['es_factible']:raise HTTPException(409,'; '.join(result['infracciones']))


async def asegurar_sin_ejecucion(db, version):
    if not version or version.estado not in ['BORRADOR', 'CONFIRMADA']:
        raise HTTPException(409, 'Selecciona un borrador o la versión confirmada vigente')
    iniciada = await db.scalar(select(Parada.id_parada).join(Ruta,Parada.id_ruta==Ruta.id_ruta).where(Ruta.version_id==version.id,Parada.estado!='PENDIENTE').limit(1))
    if iniciada: raise HTTPException(409, 'La jornada ya comenzó. Se conserva su ejecución y sus evidencias; reprograma los pedidos pendientes en otra jornada.')

@router.get('/{id}/versiones')
async def versiones(id: str, db: AsyncSession=Depends(get_db), usuario: dict=Depends(require_roles(['JEFE','ASISTENTE']))):
    rows=(await db.scalars(select(PlanificacionVersion).where(PlanificacionVersion.planificacion_id==id).order_by(PlanificacionVersion.numero.desc()))).all()
    return [dict(numero=v.numero,estado=v.estado,motivo=v.motivo,creado_en=v.creado_en) for v in rows]

class ReoptimizarRequest(BaseModel):
    vehiculo_ids: list[int] = Field(min_length=1)
    motivo: str = Field(min_length=3,max_length=200)

@router.post('/{id}/versiones/{n}/reoptimizar',status_code=201)
async def reoptimizar(id: str,n: int,req: ReoptimizarRequest,db: AsyncSession=Depends(get_db),usuario: dict=Depends(require_roles(['JEFE','ASISTENTE']))):
    plan=await db.scalar(select(Planificacion).where(Planificacion.id==id).with_for_update().execution_options(populate_existing=True))
    if not plan: raise HTTPException(404,'Planificación no encontrada')
    base=await db.scalar(select(PlanificacionVersion).where(PlanificacionVersion.planificacion_id==id,PlanificacionVersion.numero==n))
    if n != plan.version_vigente: raise HTTPException(409,'Reoptimiza desde la versión vigente')
    await asegurar_sin_ejecucion(db,base)
    ids=(await db.scalars(select(Parada.id_pedido).join(Ruta,Parada.id_ruta==Ruta.id_ruta).where(Ruta.version_id==base.id))).all()
    numero=(await db.scalar(select(func.max(PlanificacionVersion.numero)).where(PlanificacionVersion.planificacion_id==id)))+1
    parametros={**(base.parametros or {}),'version_origen':n,'motivo_reoptimizacion':req.motivo}
    return await generar_propuesta(CrearPlanificacionRequest(fecha=plan.fecha,vehiculo_ids=req.vehiculo_ids,parametros=parametros),db,usuario,plan,numero,ids)

class RutaManual(BaseModel):
    vehiculo_id: int
    repartidor_id: int | None = None
    pedido_ids: list[int] = Field(min_length=1)
class EdicionPropuesta(BaseModel):
    rutas: list[RutaManual] = Field(min_length=1)

@router.put('/{id}/versiones/{n}/asignaciones')
async def editar_asignaciones(id: str,n: int,req: EdicionPropuesta,db: AsyncSession=Depends(get_db),usuario: dict=Depends(require_roles(['JEFE','ASISTENTE']))):
    plan=await db.scalar(select(Planificacion).where(Planificacion.id==id).with_for_update())
    version=await db.scalar(select(PlanificacionVersion).where(PlanificacionVersion.planificacion_id==id,PlanificacionVersion.numero==n).with_for_update())
    if not version or not plan: raise HTTPException(404,'Propuesta no encontrada')
    if version.estado!='BORRADOR': raise HTTPException(409,'Crea una nueva versión para editar una planificación confirmada')
    await asegurar_sin_ejecucion(db,version)
    rutas=(await db.scalars(select(Ruta).where(Ruta.version_id==version.id))).all()
    paradas=(await db.scalars(select(Parada).where(Parada.id_ruta.in_([r.id_ruta for r in rutas])))).all()
    no_asignados=(await db.scalars(select(PedidoNoAsignado).where(PedidoNoAsignado.version_id==version.id))).all()
    candidatos={p.id_pedido for p in paradas}|{int(p.pedido_id) for p in no_asignados}
    ids=[pid for ruta in req.rutas for pid in ruta.pedido_ids]
    vids=[ruta.vehiculo_id for ruta in req.rutas]
    if len(ids)!=len(set(ids)) or not set(ids)<=candidatos: raise HTTPException(422,'No repitas pedidos ni agregues pedidos ajenos a la propuesta')
    if len(vids)!=len(set(vids)): raise HTTPException(422,'Cada vehículo debe tener una sola ruta')
    vehiculos=(await db.scalars(select(Vehiculo).where(Vehiculo.id_vehiculo.in_(vids),Vehiculo.activo==True,Vehiculo.estado.in_(['DISPONIBLE','ASIGNADO'])))).all()
    if len(vehiculos)!=len(vids): raise HTTPException(409,'Hay vehículos fuera de servicio')
    for ruta in req.rutas:
        if ruta.repartidor_id:
            rep=await db.get(Usuario,ruta.repartidor_id)
            if not rep or not rep.activo or rep.rol!='REPARTIDOR': raise HTTPException(422,'Repartidor no válido')
    pedidos=(await db.scalars(select(Pedido).where(Pedido.id_pedido.in_(ids)))).all()
    puntos=await puntos_con_reglas(db,pedidos)
    dia=(datetime.strptime(plan.fecha,'%d/%m/%Y').weekday()+1)%7
    if any(dia not in p.dias_permitidos or (p.ventana_inicio and p.ventana_fin and p.ventana_inicio>=p.ventana_fin) for p in puntos): raise HTTPException(409,'Un cliente no atiende en la fecha seleccionada')
    raw=[dict(vehiculo_id=str(r.vehiculo_id),pedidos_ids=[str(p) for p in r.pedido_ids]) for r in req.rutas]
    vs=[VehiculoVRP(id=v.id,placa=v.placa,capacidad_peso_kg=v.capacidad_peso_kg,capacidad_volumen_m3=v.capacidad_volumen_m3,inicio_jornada=v.inicio_jornada,fin_jornada=v.fin_jornada) for v in vehiculos]
    evaluacion=evaluar_rutas_manuales(Punto(id='DEPOT',lat=-12.2748,lon=-76.8711,tiempo_servicio_min=0),raw,vs,puntos,velocidad_kmh=20)
    if not evaluacion['es_factible']: raise HTTPException(409,'; '.join(evaluacion['infracciones']))
    # Mutate only after validating the entire assignment. The transaction remains atomic.
    for p in paradas: await db.delete(p)
    for na in no_asignados: await db.delete(na)
    await db.flush()
    for ruta in rutas: await db.delete(ruta)
    await db.flush()
    fecha=datetime.strptime(plan.fecha,'%d/%m/%Y').date()
    for i, resultado in enumerate(evaluacion['rutas']):
        ruta=Ruta(version_id=version.id,id_vehiculo=int(resultado['vehiculo_id']),id_repartidor=req.rutas[i].repartidor_id,fecha_ruta=fecha,distancia_total_km=resultado['distancia_total_km'],tiempo_estimado_min=resultado['duracion_total_min'],peso_kg=resultado['peso_total_kg'],volumen_m3=resultado['volumen_total_m3'],salida=resultado['salida_almacen'],regreso=resultado['regreso_almacen'])
        db.add(ruta); await db.flush()
        for p in resultado['paradas']:
            db.add(Parada(id_ruta=ruta.id_ruta,id_pedido=int(p['pedido_id']),secuencia=p['secuencia'],estado='PENDIENTE',inicio_atencion=p['inicio_atencion'],salida=p['salida'],espera_min=p['espera_min'],eta_estimada=datetime.combine(fecha,datetime.strptime(p['llegada'],'%H:%M').time())))
    for pid in candidatos-set(ids):db.add(PedidoNoAsignado(version_id=version.id,pedido_id=pid,codigo='SIN_ASIGNAR_MANUAL',motivo='Retirado de las rutas al editar la propuesta'))
    version.metodo='MANUAL';version.resumen={'total_rutas':len(req.rutas),'total_pedidos_asignados':len(ids),'total_no_asignados':len(candidatos-set(ids))}
    await registrar_auditoria(db,'EDITAR_PROPUESTA','planificacion_version',version.id,usuario_id=usuario['sub'],valores_despues=req.model_dump())
    await db.commit()
    return {'mensaje':'Propuesta actualizada y validada'}
