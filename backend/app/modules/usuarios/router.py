from fastapi import APIRouter,Depends,status
from pydantic import BaseModel,EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles,hash_contrasena
from backend.app.core.errores import ErrorNoEncontrado,ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Usuario,Rol
router=APIRouter(prefix="/usuarios",tags=["Usuarios"])
class Crear(BaseModel):nombres:str;apellidos:str;correo:EmailStr;clave:str;rol:str
@router.get("")
async def listar(db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ADMINISTRADOR","JEFE"]))):
 filas=(await db.execute(select(Usuario))).scalars().all()
 return [{"id":u.id_usuario,"nombres":u.nombres,"apellidos":u.apellidos,"correo":u.correo,"rol":u.rol,"activo":u.activo} for u in filas]
@router.post("",status_code=status.HTTP_201_CREATED)
async def crear(req:Crear,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ADMINISTRADOR"]))):
 if (await db.execute(select(Usuario).where(Usuario.correo==req.correo.lower()))).scalars().first():raise ErrorReglaNegocio("USUARIO_DUPLICADO","El correo ya está registrado.")
 rol=(await db.execute(select(Rol).where(Rol.nombre==req.rol.upper(),Rol.activo==True))).scalars().first()
 if not rol:raise ErrorReglaNegocio("ROL_INVALIDO","El rol indicado no existe.")
 u=Usuario(id_rol=rol.id_rol,nombres=req.nombres,apellidos=req.apellidos,correo=req.correo.lower(),password_hash=hash_contrasena(req.clave));db.add(u);await db.flush();await registrar_auditoria(db,"CREAR","usuario",u.id_usuario,usuario_id=usuario["sub"]);await db.commit();return {"id":u.id_usuario,"mensaje":"Usuario creado"}
@router.post("/{usuario_id}/desactivar")
async def desactivar(usuario_id:int,db:AsyncSession=Depends(get_db),usuario:dict=Depends(require_roles(["ADMINISTRADOR"]))):
 u=await db.get(Usuario,usuario_id)
 if not u:raise ErrorNoEncontrado("Usuario",usuario_id)
 u.activo=False;await registrar_auditoria(db,"DESACTIVAR","usuario",usuario_id,usuario_id=usuario["sub"]);await db.commit();return {"mensaje":"Usuario desactivado"}
