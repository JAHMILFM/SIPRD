from datetime import date, datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.db import get_db
from backend.app.core.seguridad import obtener_usuario_actual
from backend.app.core.reparto import asegurar_accesos, cifrador, LIMA
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.errores import ErrorNoEncontrado
from backend.app.models import Usuario, Vehiculo

router = APIRouter(prefix="/accesos-reparto", tags=["Accesos de reparto"])
ROLES_DISTRIBUCION = {"ASISTENTE", "JEFE", "ASISTENTE_DISTRIBUCION", "JEFE_DISTRIBUCION"}


async def distribucion(usuario: dict = Depends(obtener_usuario_actual)):
    """Las claves por placa sólo las administra Distribución con ese permiso."""
    if usuario["rol"] not in ROLES_DISTRIBUCION or "accesos" not in usuario.get("permisos", []):
        from backend.app.core.errores import ErrorAccesoDenegado

        raise ErrorAccesoDenegado("Los accesos de reparto son exclusivos de Distribución.")
    return usuario


@router.post("/generar")
async def generar(
    fecha: date,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(distribucion),
):
    vs = await asegurar_accesos(db, fecha, int(usuario["sub"]))
    await db.commit()
    return {"vehiculos": len(vs), "mensaje": "Claves de jornada disponibles"}


@router.get("")
async def listar(
    fecha: date,
    response: Response,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(distribucion),
):
    response.headers["Cache-Control"] = "no-store"
    # Al consultar una jornada vigente o pasada, reemplaza automáticamente
    # credenciales heredadas. Una jornada pasada conserva su vencimiento.
    if fecha <= datetime.now(LIMA).date():
        await asegurar_accesos(db, fecha, int(usuario["sub"]))
        await db.commit()
    filas = (
        await db.execute(
            select(Usuario, Vehiculo)
            .join(Vehiculo, Usuario.id_vehiculo == Vehiculo.id_vehiculo)
            .where(Usuario.fecha_reparto == fecha)
            .order_by(Vehiculo.placa)
        )
    ).all()
    return [
        {
            "id": u.id_usuario,
            "id_vehiculo": v.id_vehiculo,
            "placa": v.placa,
            "usuario": u.usuario,
            "vigente_hasta": u.clave_vigente_hasta,
            "activo": u.activo and bool(u.clave_vigente_hasta) and u.clave_vigente_hasta > datetime.now(LIMA),
        }
        for u, v in filas
    ]


@router.get("/{usuario_id}/clave")
async def consultar_clave(
    usuario_id: int,
    response: Response,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(distribucion),
):
    u = await db.get(Usuario, usuario_id)
    if not u or not u.id_vehiculo or not u.clave_cifrada:
        raise ErrorNoEncontrado("Acceso de reparto", usuario_id)
    response.headers["Cache-Control"] = "no-store"
    await registrar_auditoria(
        db,
        "ACTUALIZAR",
        "acceso_reparto",
        u.id_usuario,
        valores_despues={"evento": "CLAVE_CONSULTADA"},
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return {"clave": cifrador().decrypt(u.clave_cifrada.encode()).decode()}


@router.post("/{usuario_id}/regenerar")
async def regenerar(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(distribucion),
):
    u = await db.get(Usuario, usuario_id)
    if not u or not u.id_vehiculo:
        raise ErrorNoEncontrado("Acceso de reparto", usuario_id)
    await asegurar_accesos(db, u.fecha_reparto, int(usuario["sub"]), u.id_vehiculo)
    await db.commit()
    return {"mensaje": "Clave regenerada; las sesiones anteriores quedan invalidadas"}
