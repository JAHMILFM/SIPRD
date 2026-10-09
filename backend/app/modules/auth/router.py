from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from backend.app.core.db import get_db
from backend.app.core.seguridad import (
    hash_contrasena, verificar_contrasena, crear_access_token, crear_refresh_token,
    obtener_usuario_actual, decodificar_token
)
from backend.app.core.errores import ErrorNoAutorizado, ErrorDominio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.tiempo import ahora
from backend.app.models import Usuario, TokenRefresco

router = APIRouter(prefix="/auth", tags=["Autenticación"])

class LoginRequest(BaseModel):
    usuario: str
    clave: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: dict

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, response: Response, request: Request, db: AsyncSession = Depends(get_db)):
    # Buscar por usuario o correo sin distinguir mayúsculas
    term = req.usuario.strip().lower()
    query = select(Usuario).where(
        (Usuario.correo.ilike(term)) | (Usuario.correo.ilike(f"{term}@%"))
    )
    result = await db.execute(query)
    user = result.scalars().first()

    if not user or not verificar_contrasena(req.clave, user.hash_contrasena):
        raise ErrorNoAutorizado("Credenciales incorrectas")

    if not user.activo:
        raise ErrorDominio(
            codigo="USUARIO_DESACTIVADO",
            mensaje="El usuario se encuentra inactivo. Comuníquese con el administrador.",
            status_code=status.HTTP_403_FORBIDDEN
        )

    # Actualizar último acceso
    user.ultimo_acceso = ahora()
    
    # Generar tokens
    datos_token = {
        "sub": user.id,
        "usuario": user.usuario,
        "correo": user.correo,
        "rol": user.rol,
        "nombre": f"{user.nombre} {user.apellidos}"
    }
    access_token = crear_access_token(datos_token)
    refresh_token = crear_refresh_token({"sub": user.id})

    # Guardar token de refresco
    t_ref = TokenRefresco(
        usuario_id=user.id,
        hash_token=refresh_token[-32:], # Almacena hash parcial
        expira_en=ahora()
    )
    db.add(t_ref)

    # Registrar auditoría de login
    ip_cliente = request.client.host if request.client else None
    await registrar_auditoria(
        db=db,
        accion="LOGIN",
        entidad="usuario",
        entidad_id=user.id,
        usuario_id=user.id,
        ip=ip_cliente
    )
    await db.commit()

    # Enviar cookie httpOnly segura para refresh token
    response.set_cookie(
        key="siprd_refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False, # True en HTTPS producción
        max_age=7 * 24 * 3600
    )

    return LoginResponse(
        access_token=access_token,
        usuario={
            "id": user.id,
            "usuario": user.usuario,
            "correo": user.correo,
            "nombre": f"{user.nombre} {user.apellidos}",
            "rol": user.rol.lower(),
            "rol_db": user.rol,
            "activo": user.activo
        }
    )

@router.get("/yo")
async def obtener_perfil_actual(usuario: dict = Depends(obtener_usuario_actual), db: AsyncSession = Depends(get_db)):
    query = select(Usuario).where(Usuario.id == usuario["sub"])
    result = await db.execute(query)
    u = result.scalars().first()
    if not u or not u.activo:
        raise ErrorNoAutorizado("Usuario no encontrado o inactivo")
    return {
        "id": u.id,
        "usuario": u.usuario,
        "correo": u.correo,
        "nombre": f"{u.nombre} {u.apellidos}",
        "nombres": u.nombre,
        "apellidos": u.apellidos,
        "rol": u.rol.lower(),
        "rol_db": u.rol,
        "activo": u.activo,
        "ultimo_acceso": u.ultimo_acceso
    }

@router.post("/salir")
async def salir(response: Response, usuario: dict = Depends(obtener_usuario_actual)):
    response.delete_cookie("siprd_refresh_token")
    return {"mensaje": "Sesión finalizada exitosamente"}
