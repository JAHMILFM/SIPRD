"""Credenciales de jornada y alcance de acceso por vehículo."""

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo
from cryptography.fernet import Fernet
from sqlalchemy import select
from backend.app.models import Usuario, Rol, Ruta, Planificacion, Vehiculo, ParadaRuta
from backend.app.core.config import settings
from backend.app.core.errores import ErrorAccesoDenegado, ErrorNoEncontrado
from backend.app.core.seguridad import hash_contrasena
from backend.app.core.auditoria import registrar_auditoria

LIMA = ZoneInfo("America/Lima")


def cifrador():
    return Fernet(
        base64.urlsafe_b64encode(hashlib.sha256(settings.JWT_SECRET.encode()).digest())
    )


async def asegurar_accesos(db, fecha, actor_id=None, regenerar_vehiculo=None):
    # Serializa la rotación entre peticiones y el proceso periódico.
    from sqlalchemy import text

    await db.execute(text("SELECT pg_advisory_xact_lock(640013)"))
    vehiculos = (
        (
            await db.execute(
                select(Vehiculo)
                .join(Ruta, Ruta.id_vehiculo == Vehiculo.id_vehiculo)
                .join(
                    Planificacion,
                    Ruta.id_planificacion == Planificacion.id_planificacion,
                )
                .where(
                    Planificacion.fecha_operacion == fecha,
                    Planificacion.estado == "CONFIRMADA",
                    Ruta.estado != "CANCELADA",
                    Vehiculo.activo == True,
                )
                .distinct()
            )
        )
        .scalars()
        .all()
    )
    rol = (
        (await db.execute(select(Rol).where(Rol.nombre == "REPARTIDOR")))
        .scalars()
        .one()
    )
    now = datetime.now(LIMA)
    if fecha != now.date():
        return vehiculos
    hasta = datetime.combine(now.date() + timedelta(days=1), time.min, LIMA)
    for v in vehiculos:
        u = (
            (
                await db.execute(
                    select(Usuario).where(Usuario.id_vehiculo == v.id_vehiculo)
                )
            )
            .scalars()
            .first()
        )
        if not u:
            u = Usuario(
                id_rol=rol.id_rol,
                nombres=f"Reparto {v.placa}",
                apellidos="",
                correo=f"vehiculo-{v.id_vehiculo}@reparto.siprd.invalid",
                nombre_usuario=v.placa.upper(),
                id_vehiculo=v.id_vehiculo,
                password_hash="",
                version_sesion=1,
            )
            db.add(u)
        if (
            not u.clave_vigente_hasta
            or u.clave_vigente_hasta <= now
            or u.fecha_reparto != fecha
            or regenerar_vehiculo == v.id_vehiculo
        ):
            clave = "".join(
                secrets.choice(
                    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
                )
                for _ in range(12)
            )
            u.password_hash = hash_contrasena(clave)
            u.clave_cifrada = cifrador().encrypt(clave.encode()).decode()
            u.clave_vigente_hasta = hasta
            u.fecha_reparto = fecha
            u.activo = True
            u.version_sesion = (u.version_sesion or 0) + 1
            await db.flush()
            await registrar_auditoria(
                db,
                "ACTUALIZAR",
                "acceso_reparto",
                u.id_usuario,
                valores_despues={
                    "evento": "CLAVE_JORNADA_GENERADA",
                    "placa": v.placa,
                    "fecha_reparto": fecha.isoformat(),
                    "vigente_hasta": hasta.isoformat(),
                },
                usuario_id=actor_id,
            )
    return vehiculos


async def autorizar_ruta(db, ruta_id, usuario):
    ruta = await db.get(Ruta, ruta_id)
    if not ruta:
        raise ErrorNoEncontrado("Ruta", ruta_id)
    if usuario["rol"] == "REPARTIDOR":
        plan = await db.get(Planificacion, ruta.id_planificacion)
        if (
            ruta.id_vehiculo != usuario.get("id_vehiculo")
            or plan.estado not in ("CONFIRMADA", "REPLANIFICADA")
            or plan.fecha_operacion != usuario.get("fecha_reparto")
            or ruta.estado == "CANCELADA"
        ):
            raise ErrorAccesoDenegado("La ruta no pertenece a su vehículo y jornada.")
    return ruta


async def autorizar_parada(db, parada_id, usuario):
    parada = await db.get(ParadaRuta, parada_id)
    if not parada:
        raise ErrorNoEncontrado("Parada", parada_id)
    await autorizar_ruta(db, parada.id_ruta, usuario)
    if parada.estado == "CANCELADA":
        raise ErrorAccesoDenegado(
            "La parada fue cancelada por una nueva planificación."
        )
    return parada
