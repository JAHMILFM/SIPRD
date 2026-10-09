from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.tiempo import ahora
from backend.app.models import (
    Planificacion, PlanificacionVersion, Ruta, Parada, PedidoNoAsignado,
    Pedido, Vehiculo, Cliente, Usuario
)
from motor.motor.modelos import InstanciaVRP, Punto, VehiculoVRP
from motor.motor.planificador import optimizar_vrp
from motor.motor.evaluador import evaluar_rutas_manuales
from motor.motor.replanificador import replanificar_operacion

router = APIRouter(prefix="/planificaciones", tags=["Planificación de Rutas"])

class CrearPlanificacionRequest(BaseModel):
    fecha: str = "27/08/2026"
    vehiculo_ids: List[str]
    parametros: Optional[Dict[str, Any]] = None

@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_planificacion(
    req: CrearPlanificacionRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    """
    Genera propuesta de ruteo automático con el motor híbrido (RF-PLAN-01).
    Crea la versión 1 en estado BORRADOR.
    """
    # 1. Obtener vehículos solicitados
    v_q = await db.execute(select(Vehiculo).where(Vehiculo.id.in_(req.vehiculo_ids)))
    vehiculos_db = v_q.scalars().all()
    if not vehiculos_db:
        raise ErrorReglaNegocio("SIN_VEHICULOS", "No se encontraron vehículos operativos seleccionados")

    # 2. Obtener pedidos pendientes para la fecha
    p_q = await db.execute(
        select(Pedido, Cliente)
        .join(Cliente, Pedido.cliente_id == Cliente.id)
        .where(Pedido.fecha_corte == req.fecha, Pedido.estado == "PENDIENTE")
    )
    pedidos_filas = p_q.all()

    # Punto depósito (Lurín por defecto)
    deposito = Punto(
        id="DEPOT",
        nombre="Almacén Lurín",
        lat=-12.2748,
        lon=-76.8711,
        tiempo_servicio_min=0
    )

    vrp_pedidos = [
        Punto(
            id=p.id,
            nombre=c.nombre,
            lat=c.lat,
            lon=c.lon,
            tiempo_servicio_min=p.tiempo_servicio_min,
            peso_kg=p.peso_kg,
            volumen_m3=p.volumen_m3
        )
        for p, c in pedidos_filas
    ]

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
    plan = Planificacion(
        fecha=req.fecha,
        version_vigente=1,
        creada_por=usuario["sub"]
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
        numero=1,
        estado="BORRADOR",
        motivo="Planificación inicial generada por el motor",
        parametros=req.parametros or {},
        resumen=resumen_data,
        metodo=solucion.metodo,
        creada_por=usuario["sub"]
    )
    db.add(version)
    await db.flush()

    # Guardar rutas y paradas
    for r_res in solucion.rutas:
        nueva_ruta = Ruta(
            version_id=version.id,
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
                llegada=p_res.llegada,
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
        valores_despues={"version": 1, "rutas": len(solucion.rutas)},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {
        "planificacion_id": plan.id,
        "version_numero": 1,
        "estado": "BORRADOR",
        "resumen": resumen_data,
        "solucion": solucion.dict()
    }

@router.get("", response_model=List[dict])
async def listar_planificaciones(
    fecha: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
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
            "creado_en": p.creado_en
        }
        for p in planes
    ]

@router.get("/{id}/versiones/{n}")
async def obtener_version_plan(
    id: str,
    n: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    v_q = await db.execute(
        select(PlanificacionVersion).where(
            PlanificacionVersion.planificacion_id == id,
            PlanificacionVersion.numero == n
        )
    )
    version = v_q.scalars().first()
    if not version:
        raise ErrorNoEncontrado("PlanificacionVersion", f"{id} v{n}")

    # Rutas con paradas y detalles
    r_q = await db.execute(
        select(Ruta, Vehiculo)
        .join(Vehiculo, Ruta.vehiculo_id == Vehiculo.id)
        .where(Ruta.version_id == version.id)
    )
    rutas_filas = r_q.all()

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
                "estado": parada.estado
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
    req: Dict[str, str], # {"repartidor_id": "u..."}
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    ruta = await db.get(Ruta, ruta_id)
    if not ruta:
        raise ErrorNoEncontrado("Ruta", ruta_id)
    
    repartidor_id = req.get("repartidor_id")
    ruta.repartidor_id = repartidor_id
    await db.commit()
    return {"mensaje": "Repartidor asignado exitosamente"}

@router.post("/{id}/versiones/{n}/confirmar")
async def confirmar_version(
    id: str,
    n: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["JEFE", "ADMINISTRADOR"])) # Solo Jefe o Admin confirma
):
    """
    Confirma formalmente una versión de planificación (RF-PLAN-04 / RN-PLAN-02).
    - Exige que todas las rutas tengan repartidor asignado.
    - Cambia estado a CONFIRMADA.
    - Cambia los pedidos asociados a PLANIFICADO.
    - Una versión CONFIRMADA nunca más se edita.
    """
    v_q = await db.execute(
        select(PlanificacionVersion).where(
            PlanificacionVersion.planificacion_id == id,
            PlanificacionVersion.numero == n
        )
    )
    version = v_q.scalars().first()
    if not version:
        raise ErrorNoEncontrado("PlanificacionVersion", f"{id} v{n}")

    if version.estado == "CONFIRMADA":
        return {"mensaje": "La versión ya se encuentra confirmada"}

    # Validar que todas las rutas tengan repartidor
    r_q = await db.execute(select(Ruta).where(Ruta.version_id == version.id))
    rutas = r_q.scalars().all()
    rutas_sin_repartidor = [r for r in rutas if not r.repartidor_id]
    if rutas_sin_repartidor:
        raise ErrorReglaNegocio(
            "REPARTIDOR_REQUERIDO",
            f"No se puede confirmar el plan. Hay {len(rutas_sin_repartidor)} ruta(s) sin repartidor asignado."
        )

    # Actualizar estado de pedidos a PLANIFICADO
    for r in rutas:
        p_q = await db.execute(select(Parada).where(Parada.ruta_id == r.id))
        paradas = p_q.scalars().all()
        for par in paradas:
            ped = await db.get(Pedido, par.pedido_id)
            if ped:
                ped.estado = "PLANIFICADO"

    version.estado = "CONFIRMADA"
    version.confirmada_por = usuario["sub"]
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
