from datetime import date, datetime, time, timedelta
from typing import Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select, text
from starlette.concurrency import run_in_threadpool
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.planificacion import DEPOSITO, punto_pedido, vehiculo_motor
from backend.app.core.reparto import asegurar_accesos, LIMA
from backend.app.core.vial import matrices, trazado
from backend.app.models import (
    Planificacion,
    Ruta,
    ParadaRuta,
    Pedido,
    Vehiculo,
    Cliente,
    RestriccionCliente,
)
from motor.motor.modelos import InstanciaVRP
from motor.motor.zonas import optimizar_zonas, zona_de
from motor.motor.hibrido.evaluacion import evaluar_ruta

router = APIRouter(prefix="/planificaciones", tags=["Planificación de rutas"])
auth = require_roles(["ASISTENTE", "JEFE"])


class Parametros(BaseModel):
    inicio_jornada: time = time(7, 30)
    jornada_horas: float = Field(8, gt=0, le=8)
    criterio: Literal["jornada", "distancia"] = "jornada"

    @model_validator(mode="after")
    def validar_turno(self):
        if (
            self.inicio_jornada.hour * 60
            + self.inicio_jornada.minute
            + self.jornada_horas * 60
            >= 1440
        ):
            raise ValueError("La jornada debe comenzar y terminar el mismo día.")
        return self


class Crear(BaseModel):
    fecha: date
    vehiculo_ids: list[int] = Field(min_length=1)
    parametros: Parametros = Parametros()
    replanificar_id: int | None = None


class Grupo(BaseModel):
    id_ruta: int
    parada_ids: list[int]


class Ajustar(BaseModel):
    rutas: list[Grupo]


class Bloquear(BaseModel):
    bloqueada: bool


def hora_eta(fecha, hora):
    return datetime.combine(fecha, time.fromisoformat(hora), LIMA)


async def construir(req, db):
    vs = (
        (
            await db.execute(
                select(Vehiculo).where(
                    Vehiculo.id_vehiculo.in_(req.vehiculo_ids),
                    Vehiculo.activo == True,
                    Vehiculo.estado_operativo == "DISPONIBLE",
                )
            )
        )
        .scalars()
        .all()
    )
    if len(vs) != len(set(req.vehiculo_ids)):
        raise ErrorReglaNegocio(
            "VEHICULO_INVALIDO", "Seleccione vehículos activos y disponibles."
        )
    q = (
        select(Pedido, Cliente)
        .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
        .where(Pedido.fecha_programada == req.fecha, Pedido.habilitado_despacho == True)
    )
    if req.replanificar_id:
        anterior = await db.get(Planificacion, req.replanificar_id)
        if not anterior or anterior.fecha_operacion != req.fecha:
            raise ErrorReglaNegocio(
                "PLAN_INVALIDO", "La planificación no corresponde a la fecha."
            )
        previas = (
            (
                await db.execute(
                    select(ParadaRuta)
                    .join(Ruta, ParadaRuta.id_ruta == Ruta.id_ruta)
                    .where(Ruta.id_planificacion == anterior.id_planificacion)
                )
            )
            .scalars()
            .all()
        )
        if any(
            s.bloqueada_manual
            and s.estado not in ("ATENDIDA", "CANCELADA", "EN_CAMINO")
            for s in previas
        ):
            raise ErrorReglaNegocio(
                "PARADAS_BLOQUEADAS",
                "Desbloquee las paradas manuales antes de replanificar.",
            )
        pendientes = [
            s.id_pedido
            for s in previas
            if s.estado not in ("ATENDIDA", "CANCELADA", "EN_CAMINO")
        ]
        q = q.where((Pedido.estado == "PENDIENTE") | Pedido.id_pedido.in_(pendientes))
    else:
        q = q.where(Pedido.estado == "PENDIENTE")
    filas = (await db.execute(q.order_by(Pedido.id_pedido))).all()
    if not filas:
        raise ErrorReglaNegocio(
            "SIN_PEDIDOS", "No hay pedidos pendientes para la fecha seleccionada."
        )
    reglas_cliente = {}
    for regla in (
        await db.execute(
            select(RestriccionCliente).where(
                RestriccionCliente.id_cliente.in_([p.id_cliente for p, c in filas])
            )
        )
    ).scalars():
        reglas_cliente.setdefault(regla.id_cliente, []).append(regla)
    puntos = []
    descartados = []
    for p, c in filas:
        punto, motivo = await punto_pedido(
            db, p, c, req.fecha, reglas_cliente.get(p.id_cliente, [])
        )
        if punto:
            puntos.append(punto)
        else:
            descartados.append(
                {
                    "pedido_id": str(p.id_pedido),
                    "codigo": "RESTRICCION_O_COORDENADAS",
                    "motivo": motivo,
                }
            )
    flota = []
    start = datetime.combine(req.fecha, req.parametros.inicio_jornada)
    for v in vs:
        vm = vehiculo_motor(v)
        vm.inicio_jornada = start.strftime("%H:%M")
        vm.fin_jornada = (
            start + timedelta(hours=req.parametros.jornada_horas)
        ).strftime("%H:%M")
        flota.append(vm)
    dist, tiempos, fuente = await matrices([DEPOSITO] + puntos)
    instancia = InstanciaVRP(
        criterio=req.parametros.criterio,
        fecha=req.fecha.isoformat(),
        deposito=DEPOSITO,
        pedidos=puntos,
        vehiculos=flota,
        matriz_distancias=dist,
        matriz_tiempos=tiempos,
    )
    sol = await run_in_threadpool(optimizar_zonas, instancia)
    resultado = sol.model_dump()
    resultado["no_asignados"] += descartados
    resultado["fuente_distancias"] = fuente
    return resultado, filas


@router.post("/previsualizar")
async def preview(req: Crear, db=Depends(get_db), usuario=Depends(auth)):
    sol, _ = await construir(req, db)
    return sol


@router.post("", status_code=201)
async def crear(req: Crear, db=Depends(get_db), usuario=Depends(auth)):
    await db.execute(text("SELECT pg_advisory_xact_lock(640014)"))
    sol, filas = await construir(req, db)
    ultimo = (
        (
            await db.execute(
                select(Planificacion)
                .where(Planificacion.fecha_operacion == req.fecha)
                .order_by(Planificacion.numero_version.desc())
            )
        )
        .scalars()
        .first()
    )
    plan = Planificacion(
        fecha_operacion=req.fecha,
        numero_version=(ultimo.numero_version + 1 if ultimo else 1),
        id_planificacion_anterior=req.replanificar_id,
        algoritmo=sol["metodo"],
        estado="GENERADA" if sol["rutas"] else "INVIABLE",
        id_usuario_creador=int(usuario["sub"]),
        parametros=req.parametros.model_dump(mode="json"),
        resultado=sol,
    )
    db.add(plan)
    await db.flush()
    for r in sol["rutas"]:
        ruta = Ruta(
            id_planificacion=plan.id_planificacion,
            id_vehiculo=int(r["vehiculo_id"]),
            zona_operativa=r["zona_operativa"],
            distancia_total_km=r["distancia_total_km"],
            tiempo_estimado_min=round(r["duracion_total_min"]),
            estado="GENERADA",
        )
        db.add(ruta)
        await db.flush()
        for s in r["paradas"]:
            db.add(
                ParadaRuta(
                    id_ruta=ruta.id_ruta,
                    id_pedido=int(s["pedido_id"]),
                    secuencia=s["secuencia"],
                    eta_estimada=hora_eta(req.fecha, s["inicio_atencion"]),
                    tiempo_servicio_min=15,
                    distancia_anterior_km=0,
                    estado="PENDIENTE",
                )
            )
    await registrar_auditoria(
        db,
        "REPLANIFICAR" if req.replanificar_id else "CREAR",
        "planificacion",
        plan.id_planificacion,
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return await detalle(plan.id_planificacion, db)


@router.get("")
async def listar(fecha: date | None = None, db=Depends(get_db), usuario=Depends(auth)):
    q = select(Planificacion)
    if fecha:
        q = q.where(Planificacion.fecha_operacion == fecha)
    return [
        {
            "id": p.id_planificacion,
            "fecha": p.fecha_operacion,
            "numero_version": p.numero_version,
            "estado": p.estado,
        }
        for p in (
            await db.execute(q.order_by(Planificacion.id_planificacion.desc()))
        ).scalars()
    ]


async def detalle(plan_id, db):
    plan = await db.get(Planificacion, plan_id)
    if not plan:
        raise ErrorNoEncontrado("Planificación", plan_id)
    data = []
    for r, v in (
        await db.execute(
            select(Ruta, Vehiculo)
            .join(Vehiculo, Ruta.id_vehiculo == Vehiculo.id_vehiculo)
            .where(Ruta.id_planificacion == plan_id)
            .order_by(Ruta.id_ruta)
        )
    ).all():
        stops = (
            await db.execute(
                select(ParadaRuta, Pedido, Cliente)
                .join(Pedido, ParadaRuta.id_pedido == Pedido.id_pedido)
                .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
                .where(ParadaRuta.id_ruta == r.id_ruta)
                .order_by(ParadaRuta.secuencia)
            )
        ).all()
        data.append(
            {
                "id": r.id_ruta,
                "zona": r.zona_operativa or "HISTORICA",
                "vehiculo": {
                    "id": v.id_vehiculo,
                    "placa": v.placa,
                    "capacidad_kg": float(v.capacidad_kg),
                    "capacidad_m3": float(v.capacidad_m3),
                },
                "estado": r.estado,
                "distancia_km": float(r.distancia_total_km),
                "duracion_min": r.tiempo_estimado_min,
                "peso_kg": sum(float(p.peso_kg) for _, p, _ in stops),
                "volumen_m3": sum(float(p.volumen_m3) for _, p, _ in stops),
                "paradas": [
                    {
                        "id": s.id_parada,
                        "secuencia": s.secuencia,
                        "pedido_id": p.id_pedido,
                        "codigo": p.codigo_externo,
                        "cliente": c.razon_social,
                        "direccion": c.direccion,
                        "lat": float(p.latitud_entrega)
                        if p.latitud_entrega is not None
                        else None,
                        "lon": float(p.longitud_entrega)
                        if p.longitud_entrega is not None
                        else None,
                        "estado": s.estado,
                        "eta": s.eta_estimada,
                        "bloqueada": s.bloqueada_manual,
                        "importe": float(p.importe_total),
                        "cierre_financiero": p.cierre_financiero,
                    }
                    for s, p, c in stops
                ],
            }
        )
    return {
        "id": plan.id_planificacion,
        "fecha": plan.fecha_operacion,
        "numero_version": plan.numero_version,
        "estado": plan.estado,
        "parametros": plan.parametros
        or {"inicio_jornada": "07:30", "jornada_horas": 8},
        "resultado": plan.resultado or {},
        "rutas": data,
    }


@router.get("/{plan_id}")
async def obtener(plan_id: int, db=Depends(get_db), usuario=Depends(auth)):
    return await detalle(plan_id, db)


@router.get("/{plan_id}/rutas/{ruta_id}/trazado")
async def geometria(
    plan_id: int, ruta_id: int, db=Depends(get_db), usuario=Depends(auth)
):
    plan = await detalle(plan_id, db)
    r = next((r for r in plan["rutas"] if r["id"] == ruta_id), None)
    if not r:
        raise ErrorNoEncontrado("Ruta", ruta_id)
    pts = [
        [s["lat"], s["lon"]]
        for s in r["paradas"]
        if s["lat"] is not None and s["lon"] is not None
    ]
    return await trazado(
        [[DEPOSITO.lat, DEPOSITO.lon]] + pts + [[DEPOSITO.lat, DEPOSITO.lon]]
    )


@router.put("/{plan_id}/distribucion")
async def actualizar_distribucion(
    plan_id: int, req: Ajustar, db=Depends(get_db), usuario=Depends(auth)
):
    return await ajustar(plan_id, req, db, usuario)


async def ajustar(plan_id, req, db, usuario, confirmando=False):
    await db.execute(text("SELECT pg_advisory_xact_lock(640014)"))
    plan = await db.get(Planificacion, plan_id)
    if not plan or plan.estado not in ("GENERADA", "EN_REVISION", "CONFIRMADA"):
        raise ErrorReglaNegocio(
            "PLAN_NO_EDITABLE", "La planificación no admite cambios."
        )
    rutas = (
        (await db.execute(select(Ruta).where(Ruta.id_planificacion == plan_id)))
        .scalars()
        .all()
    )
    stops = (
        (
            await db.execute(
                select(ParadaRuta)
                .join(Ruta, ParadaRuta.id_ruta == Ruta.id_ruta)
                .where(Ruta.id_planificacion == plan_id)
            )
        )
        .scalars()
        .all()
    )
    by_id = {s.id_parada: s for s in stops}
    ids = [i for g in req.rutas for i in g.parada_ids]
    if sorted(ids) != sorted(by_id) or sorted(g.id_ruta for g in req.rutas) != sorted(
        r.id_ruta for r in rutas
    ):
        raise ErrorReglaNegocio(
            "PARADAS_INVALIDAS",
            "Cada parada y ruta deben aparecer exactamente una vez.",
        )
    grupos = {g.id_ruta: g.parada_ids for g in req.rutas}
    # Leer pedidos y restricciones en bloques evita una consulta por cada parada.
    pares = (
        await db.execute(
            select(Pedido, Cliente)
            .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
            .where(Pedido.id_pedido.in_([s.id_pedido for s in stops]))
        )
    ).all()
    pedidos_cliente = {p.id_pedido: (p, c) for p, c in pares}
    reglas_cliente = {}
    for regla in (
        await db.execute(
            select(RestriccionCliente).where(
                RestriccionCliente.id_cliente.in_([p.id_cliente for p, c in pares])
            )
        )
    ).scalars():
        reglas_cliente.setdefault(regla.id_cliente, []).append(regla)
    puntos_ruta = {}
    for r in rutas:
        for index, sid in enumerate(grupos[r.id_ruta], 1):
            s = by_id[sid]
            if (s.bloqueada_manual or s.estado in ("ATENDIDA", "EN_CAMINO")) and (
                s.id_ruta != r.id_ruta or s.secuencia != index
            ):
                raise ErrorReglaNegocio(
                    "PARADA_FIJA", "No mueva paradas bloqueadas, atendidas o en camino."
                )
            p, c = pedidos_cliente[s.id_pedido]
            punto, motivo = await punto_pedido(
                db, p, c, plan.fecha_operacion, reglas_cliente.get(p.id_cliente, [])
            )
            if (
                not punto
                or zona_de(p.latitud_entrega, p.longitud_entrega) != r.zona_operativa
            ):
                raise ErrorReglaNegocio(
                    "ZONA_O_RESTRICCION", motivo or "Reasigne dentro de la misma zona."
                )
            puntos_ruta.setdefault(r.id_ruta, []).append(punto)
    todos = [p for ps in puntos_ruta.values() for p in ps]
    dist_total, tiempo_total, _ = await matrices([DEPOSITO] + todos)
    ix = {p.id: i + 1 for i, p in enumerate(todos)}
    evaluadas = {}
    for r in rutas:
        puntos = puntos_ruta.get(r.id_ruta, [])
        v = vehiculo_motor(await db.get(Vehiculo, r.id_vehiculo))
        params = Parametros(**(plan.parametros or {}))
        v.inicio_jornada = params.inicio_jornada.strftime("%H:%M")
        v.fin_jornada = (
            datetime.combine(plan.fecha_operacion, params.inicio_jornada)
            + timedelta(hours=params.jornada_horas)
        ).strftime("%H:%M")
        indices = [0] + [ix[p.id] for p in puntos]
        dist = [[dist_total[i][j] for j in indices] for i in indices]
        tiempos = [[tiempo_total[i][j] for j in indices] for i in indices]
        ev = evaluar_ruta(
            DEPOSITO, puntos, v, dist, tiempos, 0, list(range(1, len(puntos) + 1))
        )
        if ev["infracciones"]:
            raise ErrorReglaNegocio("RUTA_INVIABLE", "; ".join(ev["infracciones"]))
        evaluadas[r.id_ruta] = ev
    orden_anterior = {
        str(r.id_ruta): [
            s.id_parada
            for s in sorted(stops, key=lambda s: s.secuencia)
            if s.id_ruta == r.id_ruta
        ]
        for r in rutas
    }
    # Evitar colisiones de UNIQUE durante los intercambios.
    for s in stops:
        s.secuencia += 100000
    await db.flush()
    for r in rutas:
        ev = evaluadas[r.id_ruta]
        r.distancia_total_km = ev["distancia_total_km"]
        r.tiempo_estimado_min = round(ev["duracion_total_min"])
        for index, sid in enumerate(grupos[r.id_ruta], 1):
            s = by_id[sid]
            s.id_ruta = r.id_ruta
            s.secuencia = index
            s.eta_estimada = hora_eta(
                plan.fecha_operacion, ev["paradas"][index - 1].inicio_atencion
            )
    if plan.estado != "CONFIRMADA":
        plan.estado = "EN_REVISION"
    await registrar_auditoria(
        db,
        "ACTUALIZAR",
        "planificacion",
        plan_id,
        usuario_id=usuario["sub"],
        valores_antes={"orden": orden_anterior},
        valores_despues={"orden": {str(k): v for k, v in grupos.items()}},
    )
    if not confirmando:
        await db.commit()
    return await detalle(plan_id, db)


@router.put("/{plan_id}/paradas/{parada_id}/bloqueo")
async def bloqueo(
    plan_id: int,
    parada_id: int,
    req: Bloquear,
    db=Depends(get_db),
    usuario=Depends(auth),
):
    s = await db.get(ParadaRuta, parada_id)
    r = await db.get(Ruta, s.id_ruta) if s else None
    if not r or r.id_planificacion != plan_id:
        raise ErrorNoEncontrado("Parada", parada_id)
    s.bloqueada_manual = req.bloqueada
    await registrar_auditoria(
        db,
        "ACTUALIZAR",
        "parada",
        parada_id,
        valores_despues={"bloqueada": req.bloqueada},
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return {"mensaje": "Bloqueo actualizado"}


@router.post("/{plan_id}/confirmar")
async def confirmar(plan_id: int, db=Depends(get_db), usuario=Depends(auth)):
    await db.execute(text("SELECT pg_advisory_xact_lock(640014)"))
    p = await db.get(Planificacion, plan_id)
    if not p:
        raise ErrorNoEncontrado("Planificación", plan_id)
    if p.estado == "CONFIRMADA":
        return await detalle(plan_id, db)
    if p.estado not in ("GENERADA", "EN_REVISION"):
        raise ErrorReglaNegocio(
            "PLAN_NO_CONFIRMABLE", "La planificación no admite confirmación."
        )
    rutas = (
        (await db.execute(select(Ruta).where(Ruta.id_planificacion == plan_id)))
        .scalars()
        .all()
    )
    if not rutas:
        raise ErrorReglaNegocio("SIN_RUTAS", "No hay rutas para confirmar.")
    grupos = []
    for r in rutas:
        paradas = (
            (
                await db.execute(
                    select(ParadaRuta)
                    .where(ParadaRuta.id_ruta == r.id_ruta)
                    .order_by(ParadaRuta.secuencia)
                )
            )
            .scalars()
            .all()
        )
        grupos.append(
            Grupo(id_ruta=r.id_ruta, parada_ids=[s.id_parada for s in paradas])
        )
    await ajustar(plan_id, Ajustar(rutas=grupos), db, usuario, confirmando=True)
    if p.id_planificacion_anterior:
        anterior = await db.get(Planificacion, p.id_planificacion_anterior)
        anterior.estado = "REPLANIFICADA"
        for s in (
            await db.execute(
                select(ParadaRuta)
                .join(Ruta, ParadaRuta.id_ruta == Ruta.id_ruta)
                .where(Ruta.id_planificacion == anterior.id_planificacion)
            )
        ).scalars():
            if s.estado not in ("ATENDIDA", "CANCELADA", "EN_CAMINO"):
                s.estado = "CANCELADA"
    await db.flush()
    for r in rutas:
        for s in (
            await db.execute(select(ParadaRuta).where(ParadaRuta.id_ruta == r.id_ruta))
        ).scalars():
            ped = await db.get(Pedido, s.id_pedido)
            other = (
                (
                    await db.execute(
                        select(ParadaRuta)
                        .join(Ruta, ParadaRuta.id_ruta == Ruta.id_ruta)
                        .join(
                            Planificacion,
                            Ruta.id_planificacion == Planificacion.id_planificacion,
                        )
                        .where(
                            ParadaRuta.id_pedido == ped.id_pedido,
                            Planificacion.estado == "CONFIRMADA",
                            Planificacion.id_planificacion != plan_id,
                            ParadaRuta.estado != "CANCELADA",
                        )
                    )
                )
                .scalars()
                .first()
            )
            if other:
                raise ErrorReglaNegocio(
                    "PEDIDO_YA_ASIGNADO",
                    "Un pedido ya figura en una planificación confirmada.",
                )
            ped.estado = "PLANIFICADO"
        r.estado = "CONFIRMADA"
    p.estado = "CONFIRMADA"
    p.id_usuario_confirmador = int(usuario["sub"])
    p.fecha_confirmacion = datetime.now(LIMA)
    await db.flush()
    await asegurar_accesos(db, p.fecha_operacion, int(usuario["sub"]))
    await registrar_auditoria(
        db, "CONFIRMAR", "planificacion", plan_id, usuario_id=usuario["sub"]
    )
    await db.commit()
    return await detalle(plan_id, db)
