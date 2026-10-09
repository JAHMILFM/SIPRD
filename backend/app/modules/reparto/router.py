from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles, obtener_usuario_actual
from backend.app.core.errores import ErrorNoEncontrado, ErrorAccesoDenegado, ErrorReglaNegocio
from backend.app.core.almacenamiento import guardar_archivo
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.tiempo import ahora
from backend.app.models import (
    Ruta, Parada, Pedido, Cliente, Vehiculo, EvidenciaEntrega,
    Incidencia, PlanificacionVersion, Planificacion
)

router = APIRouter(prefix="/reparto", tags=["Módulo Móvil de Reparto"])

@router.get("/mi-ruta")
async def obtener_mi_ruta(
    fecha: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["REPARTIDOR", "ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    """
    Devuelve la ruta asignada al repartidor autenticado para la fecha solicitada (RF-REP-01).
    Solo expone rutas en versiones CONFIRMADAS.
    """
    user_id = usuario["sub"]
    
    query = (
        select(Ruta, PlanificacionVersion, Planificacion, Vehiculo)
        .join(PlanificacionVersion, Ruta.version_id == PlanificacionVersion.id)
        .join(Planificacion, PlanificacionVersion.planificacion_id == Planificacion.id)
        .join(Vehiculo, Ruta.vehiculo_id == Vehiculo.id)
        .where(
            PlanificacionVersion.estado == "CONFIRMADA"
        )
    )

    # Si es repartidor, solo puede ver SU ruta (prevención de IDOR)
    if usuario.get("rol", "").upper() == "REPARTIDOR":
        query = query.where(Ruta.repartidor_id == user_id)
        
    if fecha:
        query = query.where(Planificacion.fecha == fecha)

    result = await db.execute(query.order_by(Planificacion.creado_en.desc()))
    fila = result.first()
    if not fila:
        return {"mensaje": "No tiene rutas activas confirmadas asignadas para esta fecha"}

    ruta, version, plan, vehiculo = fila

    # Obtener paradas
    p_q = await db.execute(
        select(Parada, Pedido, Cliente)
        .join(Pedido, Parada.pedido_id == Pedido.id)
        .join(Cliente, Pedido.cliente_id == Cliente.id)
        .where(Parada.ruta_id == ruta.id)
        .order_by(Parada.secuencia)
    )
    paradas_filas = p_q.all()

    paradas_formato = [
        {
            "id": par.id,
            "secuencia": par.secuencia,
            "pedido_id": ped.id,
            "codigo_externo": ped.codigo_externo,
            "cliente": cli.nombre,
            "direccion": cli.direccion,
            "distrito": cli.distrito,
            "lat": cli.lat,
            "lon": cli.lon,
            "importe_total": ped.importe_total,
            "peso_kg": ped.peso_kg,
            "volumen_m3": ped.volumen_m3,
            "llegada": par.llegada,
            "salida": par.salida,
            "estado": par.estado,
            "estado_pedido": ped.estado
        }
        for par, ped, cli in paradas_filas
    ]

    return {
        "ruta_id": ruta.id,
        "fecha": plan.fecha,
        "vehiculo": {
            "placa": vehiculo.placa,
            "marca": vehiculo.marca,
            "modelo": vehiculo.modelo
        },
        "salida": ruta.salida,
        "regreso": ruta.regreso,
        "distancia_km": ruta.distancia_km,
        "duracion_min": ruta.duracion_min,
        "paradas": paradas_formato
    }

@router.post("/paradas/{id}/evidencias", status_code=status.HTTP_201_CREATED)
async def registrar_evidencia_entrega(
    id: str,
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["REPARTIDOR", "ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    """
    Sube foto de evidencia de entrega (RF-REP-02).
    Marca la parada como COMPLETADA y el pedido como ENTREGADO.
    """
    parada = await db.get(Parada, id)
    if not parada:
        raise ErrorNoEncontrado("Parada", id)

    # Validar propiedad de la ruta si es repartidor
    if usuario.get("rol", "").upper() == "REPARTIDOR":
        ruta = await db.get(Ruta, parada.ruta_id)
        if not ruta or ruta.repartidor_id != usuario["sub"]:
            raise ErrorAccesoDenegado("No tiene autorización para modificar esta parada.")

    # Guardar archivo validando tamaño y tipo
    info_archivo = await guardar_archivo(archivo, subcarpeta="evidencias")

    evidencia = EvidenciaEntrega(
        parada_id=parada.id,
        pedido_id=parada.pedido_id,
        clave_archivo=info_archivo["clave_archivo"],
        tipo_mime=info_archivo["tipo_mime"],
        tamano_bytes=info_archivo["tamano_bytes"],
        subida_por=usuario["sub"]
    )
    db.add(evidencia)

    # Actualizar estado de parada y pedido
    parada.estado = "COMPLETADA"
    parada.completada_en = ahora()

    pedido = await db.get(Pedido, parada.pedido_id)
    if pedido:
        pedido.estado = "ENTREGADO"

    await registrar_auditoria(
        db=db,
        accion="ENTREGA_COMPLETADA",
        entidad="parada",
        entidad_id=parada.id,
        valores_despues={"estado": "COMPLETADA", "pedido_estado": "ENTREGADO"},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {
        "mensaje": "Evidencia registrada y entrega completada con éxito",
        "evidencia_id": evidencia.id,
        "clave_archivo": evidencia.clave_archivo
    }

@router.post("/paradas/{id}/incidencias", status_code=status.HTTP_201_CREATED)
async def registrar_incidencia_parada(
    id: str,
    tipo: str = Form(...),
    descripcion: str = Form(...),
    marcar_fallida: bool = Form(True),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["REPARTIDOR", "ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    """
    Registra incidencia en ruta/parada (RF-INC-01).
    Puede marcar la parada como FALLIDA.
    """
    parada = await db.get(Parada, id)
    if not parada:
        raise ErrorNoEncontrado("Parada", id)

    incidencia = Incidencia(
        ruta_id=parada.ruta_id,
        parada_id=parada.id,
        tipo=tipo.upper(),
        descripcion=descripcion,
        estado="ABIERTA",
        registrada_por=usuario["sub"]
    )
    db.add(incidencia)

    if marcar_fallida:
        parada.estado = "FALLIDA"
        pedido = await db.get(Pedido, parada.pedido_id)
        if pedido:
            pedido.estado = "FALLIDO"

    await registrar_auditoria(
        db=db,
        accion="REGISTRAR_INCIDENCIA",
        entidad="incidencia",
        entidad_id=incidencia.id,
        valores_despues={"tipo": tipo, "parada_id": parada.id},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {"mensaje": "Incidencia registrada exitosamente", "incidencia_id": incidencia.id}
