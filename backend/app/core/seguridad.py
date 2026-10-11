from datetime import datetime, timedelta, timezone
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from backend.app.core.config import settings
from backend.app.core.errores import ErrorNoAutorizado, ErrorAccesoDenegado
from backend.app.core.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.tiempo import ahora

ph = PasswordHasher()
security = HTTPBearer(auto_error=False)


def hash_contrasena(clave: str) -> str:
    """Hashea una contraseña utilizando Argon2id."""
    return ph.hash(clave)


def verificar_contrasena(clave_plana: str, hash_almacenado: str) -> bool:
    """Verifica si la contraseña coincide con el hash Argon2id."""
    try:
        return ph.verify(hash_almacenado, clave_plana)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def crear_access_token(data: dict, expira_en: Optional[timedelta] = None) -> str:
    """Genera un JWT Access Token."""
    payload = data.copy()
    expiracion = datetime.now(timezone.utc) + (
        expira_en or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expiracion, "tipo": "access"})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def crear_refresh_token(data: dict, expira_en: Optional[timedelta] = None) -> str:
    """Genera un JWT Refresh Token."""
    payload = data.copy()
    expiracion = datetime.now(timezone.utc) + (
        expira_en or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    payload.update({"exp": expiracion, "tipo": "refresh"})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decodificar_token(token: str) -> dict:
    """Decodifica y valida la firma de un token JWT."""
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise ErrorNoAutorizado("El token ha expirado")
    except jwt.InvalidTokenError:
        raise ErrorNoAutorizado("Token inválido")


async def obtener_usuario_actual(
    credenciales: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Dependencia para autenticar la petición y extraer el usuario del token."""
    if not credenciales:
        raise ErrorNoAutorizado("Se requiere autenticación Bearer")
    payload = decodificar_token(credenciales.credentials)
    if payload.get("tipo") != "access":
        raise ErrorNoAutorizado("Token inválido para esta operación")
    from backend.app.models import Usuario

    try:
        user = await db.get(Usuario, int(payload.get("sub", "")))
    except (TypeError, ValueError):
        raise ErrorNoAutorizado("Sesión inválida")
    if not user or not user.activo or not user.rol_rel.activo:
        raise ErrorNoAutorizado("Usuario inactivo")
    if payload.get("version_sesion") != user.version_sesion:
        raise ErrorNoAutorizado("La sesión fue renovada. Ingrese nuevamente.")
    if user.rol == "REPARTIDOR" and (
        not user.clave_vigente_hasta or user.clave_vigente_hasta <= ahora()
    ):
        raise ErrorNoAutorizado(
            "La clave de reparto venció. Solicite la clave de la jornada."
        )
    if user.rol == "REPARTIDOR":
        from backend.app.models import Vehiculo

        vehiculo = await db.get(Vehiculo, user.id_vehiculo)
        if not vehiculo or not vehiculo.activo:
            raise ErrorNoAutorizado("El vehículo ya no está habilitado para reparto.")
    payload.update(
        rol=user.rol, id_vehiculo=user.id_vehiculo, fecha_reparto=user.fecha_reparto,
        permisos=permisos_rol(user.rol_rel)
    )
    return payload


from backend.app.core.permisos import permisos_rol, permiso_peticion


def require_roles(roles_permitidos: List[str]):
    async def validador(request: Request, usuario: dict = Depends(obtener_usuario_actual)):
        permiso = permiso_peticion(request.url.path, request.method, usuario["rol"])
        # La gestión de identidad y permisos permanece reservada al administrador.
        if permiso in ("usuarios", "roles") and usuario["rol"] != "ADMINISTRADOR":
            raise ErrorAccesoDenegado("Solo el administrador puede gestionar usuarios y roles.")
        if permiso:
            opciones = permiso if isinstance(permiso, tuple) else (permiso,)
            if not any(p in usuario.get("permisos", []) for p in opciones):
                raise ErrorAccesoDenegado("Su rol no tiene permiso para esta operación.")
        else:
            aliases = {"ASISTENTE": "ASISTENTE_DISTRIBUCION", "JEFE": "JEFE_DISTRIBUCION"}
            if usuario["rol"] not in [aliases.get(r, r) for r in roles_permitidos]:
                raise ErrorAccesoDenegado("Acceso restringido para su rol.")
        return usuario
    return validador
