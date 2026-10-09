from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles, hash_contrasena, obtener_usuario_actual
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Usuario

router = APIRouter(prefix="/usuarios", tags=["Gestión de Usuarios"])

class UsuarioCreate(BaseModel):
    nombre: str
    apellidos: str
    correo: EmailStr
    usuario: str
    clave: str
    rol: str # ADMINISTRADOR, JEFE, ASISTENTE, REPARTIDOR, TESORERIA

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    correo: Optional[EmailStr] = None
    clave: Optional[str] = None
    rol: Optional[str] = None

@router.get("", response_model=List[dict])
async def listar_usuarios(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_roles(["ADMINISTRADOR", "JEFE"]))
):
    result = await db.execute(select(Usuario))
    usuarios = result.scalars().all()
    return [
        {
            "id": u.id,
            "nombre": u.nombre,
            "apellidos": u.apellidos,
            "usuario": u.usuario,
            "correo": u.correo,
            "rol": u.rol,
            "activo": u.activo,
            "ultimo_acceso": u.ultimo_acceso,
            "creado_en": u.creado_en
        }
        for u in usuarios
    ]

@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    req: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_roles(["ADMINISTRADOR"]))
):
    # Validar unicidad
    existente = await db.execute(
        select(Usuario).where((Usuario.usuario == req.usuario) | (Usuario.correo == req.correo.lower()))
    )
    if existente.scalars().first():
        raise ErrorReglaNegocio("USUARIO_DUPLICADO", "El nombre de usuario o correo ya está registrado.")

    nuevo = Usuario(
        nombre=req.nombre,
        apellidos=req.apellidos,
        correo=req.correo.lower(),
        usuario=req.usuario,
        hash_contrasena=hash_contrasena(req.clave),
        rol=req.rol.upper(),
        activo=True
    )
    db.add(nuevo)
    await db.flush()

    await registrar_auditoria(
        db=db,
        accion="CREAR_USUARIO",
        entidad="usuario",
        entidad_id=nuevo.id,
        valores_despues={"usuario": nuevo.usuario, "rol": nuevo.rol, "correo": nuevo.correo},
        usuario_id=admin["sub"]
    )
    await db.commit()

    return {"id": nuevo.id, "mensaje": "Usuario creado satisfactoriamente"}

@router.post("/{id}/desactivar")
async def desactivar_usuario(
    id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_roles(["ADMINISTRADOR"]))
):
    u = await db.get(Usuario, id)
    if not u:
        raise ErrorNoEncontrado("Usuario", id)

    estado_previo = u.activo
    u.activo = False

    await registrar_auditoria(
        db=db,
        accion="DESACTIVAR_USUARIO",
        entidad="usuario",
        entidad_id=u.id,
        valores_antes={"activo": estado_previo},
        valores_despues={"activo": False},
        usuario_id=admin["sub"]
    )
    await db.commit()
    return {"mensaje": f"Usuario {u.usuario} desactivado exitosamente"}

@router.post("/{id}/reactivar")
async def reactivar_usuario(
    id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_roles(["ADMINISTRADOR"]))
):
    u = await db.get(Usuario, id)
    if not u:
        raise ErrorNoEncontrado("Usuario", id)

    estado_previo = u.activo
    u.activo = True

    await registrar_auditoria(
        db=db,
        accion="REACTIVAR_USUARIO",
        entidad="usuario",
        entidad_id=u.id,
        valores_antes={"activo": estado_previo},
        valores_despues={"activo": True},
        usuario_id=admin["sub"]
    )
    await db.commit()
    return {"mensaje": f"Usuario {u.usuario} reactivado exitosamente"}
