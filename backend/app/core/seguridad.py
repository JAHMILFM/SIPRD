from datetime import datetime, timedelta
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from backend.app.core.config import settings
from backend.app.core.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.errores import ErrorNoAutorizado, ErrorAccesoDenegado

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
    expiracion = datetime.utcnow() + (expira_en or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload.update({"exp": expiracion, "tipo": "access"})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def crear_refresh_token(data: dict, expira_en: Optional[timedelta] = None) -> str:
    """Genera un JWT Refresh Token."""
    payload = data.copy()
    expiracion = datetime.utcnow() + (expira_en or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    payload.update({"exp": expiracion, "tipo": "refresh"})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decodificar_token(token: str) -> dict:
    """Decodifica y valida la firma de un token JWT."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ErrorNoAutorizado("El token ha expirado")
    except jwt.InvalidTokenError:
        raise ErrorNoAutorizado("Token inválido")

async def obtener_usuario_actual(credenciales: Optional[HTTPAuthorizationCredentials] = Depends(security), db: AsyncSession = Depends(get_db)) -> dict:
    """Dependencia para autenticar la petición y extraer el usuario del token."""
    if not credenciales:
        raise ErrorNoAutorizado("Se requiere autenticación Bearer")
    payload = decodificar_token(credenciales.credentials)
    if payload.get("tipo") != "access":
        raise ErrorNoAutorizado("Token inválido para esta operación")
    from backend.app.models import Usuario
    try:
        user = await db.get(Usuario, int(payload["sub"]))
    except (ValueError, KeyError, TypeError):
        raise ErrorNoAutorizado("Sesión inválida")
    if not user or not user.activo:
        raise ErrorNoAutorizado("La cuenta está desactivada")
    payload["rol"] = user.rol
    return payload

def require_roles(roles_permitidos: List[str]):
    """Filtro de autorización de roles RBAC."""
    async def validador(usuario: dict = Depends(obtener_usuario_actual)):
        rol_usuario = usuario.get("rol", "").upper()
        permitidos_upper = [r.upper() for r in roles_permitidos]
        if rol_usuario not in permitidos_upper:
            raise ErrorAccesoDenegado(f"El rol {rol_usuario} no tiene permisos para esta acción")
        return usuario
    return validador
