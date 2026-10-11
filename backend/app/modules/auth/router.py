from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.db import get_db
from backend.app.core.seguridad import (
    verificar_contrasena,
    crear_access_token,
    obtener_usuario_actual,
)
from backend.app.core.errores import ErrorNoAutorizado
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.tiempo import ahora
from backend.app.models import Usuario
from backend.app.core.permisos import permisos_rol

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class LoginRequest(BaseModel):
    usuario: str
    clave: str


def perfil(u):
    return {
        "id": u.id_usuario,
        "usuario": u.usuario,
        "correo": u.correo,
        "nombre": f"{u.nombres} {u.apellidos}".strip(),
        "rol": u.rol,
        "permisos": permisos_rol(u.rol_rel),
        "id_vehiculo": u.id_vehiculo,
        "vigente_hasta": u.clave_vigente_hasta,
        "activo": u.activo,
    }


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    term = req.usuario.strip().lower()
    u = (
        (
            await db.execute(
                select(Usuario).where(
                    (func.lower(Usuario.nombre_usuario) == term)
                    | (func.lower(Usuario.correo) == term)
                )
            )
        )
        .scalars()
        .first()
    )
    if (
        not u
        or not u.activo
        or not u.rol_rel.activo
        or not verificar_contrasena(req.clave, u.password_hash)
    ):
        raise ErrorNoAutorizado("Usuario o contraseña incorrectos.")
    if u.rol == "REPARTIDOR" and (
        not u.clave_vigente_hasta or u.clave_vigente_hasta <= ahora()
    ):
        raise ErrorNoAutorizado(
            "La clave de reparto venció. Solicite la clave de la jornada."
        )
    token = crear_access_token(
        {"sub": str(u.id_usuario), "rol": u.rol, "version_sesion": u.version_sesion}
    )
    await registrar_auditoria(
        db, "LOGIN", "usuario", u.id_usuario, usuario_id=u.id_usuario
    )
    await db.commit()
    return {"access_token": token, "token_type": "bearer", "usuario": perfil(u)}


@router.get("/yo")
async def yo(
    usuario: dict = Depends(obtener_usuario_actual), db: AsyncSession = Depends(get_db)
):
    return perfil(await db.get(Usuario, int(usuario["sub"])))


@router.post("/salir")
async def salir(
    usuario: dict = Depends(obtener_usuario_actual), db: AsyncSession = Depends(get_db)
):
    u = await db.get(Usuario, int(usuario["sub"]))
    u.version_sesion += 1
    await registrar_auditoria(
        db, "LOGOUT", "usuario", u.id_usuario, usuario_id=u.id_usuario
    )
    await db.commit()
    return {"mensaje": "Sesión finalizada"}
