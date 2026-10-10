from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles, hash_contrasena
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Usuario, Rol

router = APIRouter(prefix="/usuarios", tags=["Gestión de usuarios"])
RolNombre = Literal["ADMINISTRADOR", "JEFE", "ASISTENTE", "REPARTIDOR", "TESORERIA"]
admin_only = require_roles(["ADMINISTRADOR", "JEFE"])

class UsuarioCreate(BaseModel):
    model_config = {"str_strip_whitespace": True}
    nombre: str = Field(min_length=1, max_length=100)
    apellidos: str = Field(min_length=1, max_length=100)
    documento: str | None = Field(default=None, max_length=30)
    correo: EmailStr
    usuario: str = Field(min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9._-]+$")
    clave: str = Field(min_length=6, max_length=128)
    rol: RolNombre

class UsuarioUpdate(BaseModel):
    model_config = {"str_strip_whitespace": True}
    nombre: str = Field(min_length=1, max_length=100)
    apellidos: str = Field(min_length=1, max_length=100)
    documento: str | None = Field(default=None, max_length=30)
    correo: EmailStr
    usuario: str = Field(min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9._-]+$")
    rol: RolNombre
    activo: bool = True
    clave: str | None = Field(default=None, min_length=6, max_length=128)

def serializar(u):
    return dict(id=u.id, nombre=u.nombre, apellidos=u.apellidos, documento=u.documento,
                usuario=u.usuario, correo=u.correo, rol=u.rol, activo=u.activo,
                ultimo_acceso=u.ultimo_acceso, creado_en=u.creado_en)

async def aplicar(db, u, req, admin):
    if admin['rol'].upper() == 'JEFE' and (req.rol == 'ADMINISTRADOR' or (u.id_usuario and u.rol == 'ADMINISTRADOR')):
        raise HTTPException(403, "La cuenta administradora y sus permisos solo pueden ser gestionados por Administración")
    correo=str(req.correo).strip().lower(); username=req.usuario.strip().lower()
    existente=await db.scalar(select(Usuario).where(
        ((func.lower(Usuario.correo)==correo) | (func.lower(Usuario.nombre_usuario)==username)),
        Usuario.id_usuario != (u.id_usuario or 0)))
    if existente: raise HTTPException(409,"El usuario o correo ya está registrado")
    rol=await db.scalar(select(Rol).where(Rol.nombre==req.rol))
    if not rol: raise HTTPException(422,"Rol no disponible")
    if u.id_usuario and str(u.id_usuario)==str(admin["sub"]) and (req.rol!=admin["rol"].upper() or not getattr(req,"activo",True)):
        raise HTTPException(409,"No puedes cambiar tu propio rol ni desactivar tu acceso")
    u.nombres=req.nombre.strip(); u.apellidos=req.apellidos.strip(); u.documento=req.documento
    u.correo=correo; u.nombre_usuario=username; u.id_rol=rol.id_rol; u.rol_rel=rol
    u.activo=getattr(req,"activo",True)
    if req.clave: u.password_hash=hash_contrasena(req.clave)

@router.get("")
async def listar(db:AsyncSession=Depends(get_db), admin:dict=Depends(admin_only)):
    return [serializar(u) for u in (await db.scalars(select(Usuario).order_by(Usuario.id_usuario))).all()]

@router.post("",status_code=201)
async def crear(req:UsuarioCreate,db:AsyncSession=Depends(get_db),admin:dict=Depends(admin_only)):
    u=Usuario(); await aplicar(db,u,req,admin); db.add(u); await db.flush()
    await registrar_auditoria(db,"CREAR","usuario",u.id,usuario_id=admin["sub"],valores_despues=serializar_seguro(u))
    return {"id":u.id,"mensaje":"Usuario registrado"}

def serializar_seguro(u):
    return dict(usuario=u.usuario,correo=u.correo,rol=u.rol,activo=u.activo)

@router.put("/{id}")
async def actualizar(id:int,req:UsuarioUpdate,db:AsyncSession=Depends(get_db),admin:dict=Depends(admin_only)):
    u=await db.get(Usuario,id)
    if not u: raise HTTPException(404,"Usuario no encontrado")
    antes=serializar_seguro(u); await aplicar(db,u,req,admin)
    await registrar_auditoria(db,"ACTUALIZAR","usuario",u.id,usuario_id=admin["sub"],valores_antes=antes,valores_despues=serializar_seguro(u))
    return {"mensaje":"Usuario actualizado"}

async def estado_usuario(id,activo,db,admin):
    u=await db.get(Usuario,id)
    if not u: raise HTTPException(404,"Usuario no encontrado")
    if str(id)==str(admin["sub"]) and not activo: raise HTTPException(409,"No puedes desactivar tu propia cuenta")
    if admin['rol'].upper() == 'JEFE' and u.rol == 'ADMINISTRADOR':
        raise HTTPException(403, "Solo Administración puede modificar esta cuenta")
    antes=u.activo;u.activo=activo
    await registrar_auditoria(db,"ACTUALIZAR","usuario",u.id,usuario_id=admin["sub"],valores_antes={"activo":antes},valores_despues={"activo":activo})
    return {"mensaje":"Estado de acceso actualizado"}

@router.post("/{id}/desactivar")
async def desactivar(id:int,db:AsyncSession=Depends(get_db),admin:dict=Depends(admin_only)):
    return await estado_usuario(id,False,db,admin)

@router.post("/{id}/reactivar")
async def reactivar(id:int,db:AsyncSession=Depends(get_db),admin:dict=Depends(admin_only)):
    return await estado_usuario(id,True,db,admin)

@router.get("/repartidores")
async def repartidores(db:AsyncSession=Depends(get_db),u:dict=Depends(require_roles(["ASISTENTE","JEFE"]))):
    rows=(await db.scalars(select(Usuario).join(Rol).where(Rol.nombre=="REPARTIDOR",Usuario.activo==True))).all()
    return [dict(id=u.id,nombre=f"{u.nombre} {u.apellidos}") for u in rows]
