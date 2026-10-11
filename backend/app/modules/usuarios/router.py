from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles, hash_contrasena
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Usuario, Rol
from backend.app.core.permisos import CATALOGO, permisos_rol

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


class Crear(BaseModel):
    nombres: str
    apellidos: str
    correo: EmailStr
    clave: str = Field(min_length=12)
    rol: str
    nombre_usuario: str = Field(min_length=3, max_length=255)


@router.get("")
async def listar(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ADMINISTRADOR"])),
):
    filas = (await db.execute(select(Usuario))).scalars().all()
    return [
        {
            "id": u.id_usuario,
            "nombres": u.nombres,
            "apellidos": u.apellidos,
            "correo": u.correo,
            "nombre_usuario": u.usuario,
            "rol": u.rol,
            "activo": u.activo,
        }
        for u in filas
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear(
    req: Crear,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ADMINISTRADOR"])),
):
    if (
        (await db.execute(select(Usuario).where(Usuario.correo == req.correo.lower())))
        .scalars()
        .first()
    ):
        raise ErrorReglaNegocio("USUARIO_DUPLICADO", "El correo ya está registrado.")
    if (
        (
            await db.execute(
                select(Usuario).where(
                    func.lower(Usuario.nombre_usuario) == req.nombre_usuario.lower()
                )
            )
        )
        .scalars()
        .first()
    ):
        raise ErrorReglaNegocio(
            "USUARIO_DUPLICADO", "El nombre de usuario ya está registrado."
        )
    rol = (
        (
            await db.execute(
                select(Rol).where(Rol.nombre == req.rol.upper(), Rol.activo == True)
            )
        )
        .scalars()
        .first()
    )
    if not rol or rol.nombre == "REPARTIDOR":
        raise ErrorReglaNegocio("ROL_INVALIDO", "El rol indicado no existe.")
    u = Usuario(
        id_rol=rol.id_rol,
        nombres=req.nombres,
        apellidos=req.apellidos,
        correo=req.correo.lower(),
        password_hash=hash_contrasena(req.clave),
        nombre_usuario=req.nombre_usuario.lower(),
        version_sesion=1,
    )
    db.add(u)
    await db.flush()
    await registrar_auditoria(
        db, "CREAR", "usuario", u.id_usuario, usuario_id=usuario["sub"]
    )
    await db.commit()
    return {"id": u.id_usuario, "mensaje": "Usuario creado"}


@router.post("/{usuario_id}/desactivar")
async def desactivar(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ADMINISTRADOR"])),
):
    u = await db.get(Usuario, usuario_id)
    if not u:
        raise ErrorNoEncontrado("Usuario", usuario_id)
    if str(u.id_usuario) == str(usuario["sub"]):
        raise ErrorReglaNegocio(
            "ADMIN_PROTEGIDO", "No puede desactivar su propia cuenta de administración."
        )
    u.activo = False
    await registrar_auditoria(
        db, "DESACTIVAR", "usuario", usuario_id, usuario_id=usuario["sub"]
    )
    await db.commit()
    return {"mensaje": "Usuario desactivado"}


@router.get("/roles")
async def roles(db=Depends(get_db), usuario=Depends(require_roles(["ADMINISTRADOR"]))):
    return [
        {
            "id": r.id_rol,
            "nombre": r.nombre,
            "descripcion": r.descripcion,
            "permisos": permisos_rol(r),
            "catalogo": CATALOGO,
        }
        for r in (await db.execute(select(Rol).where(Rol.activo == True))).scalars()
    ]


class PermisosRol(BaseModel):
    permisos: list[str]


@router.put("/roles/{rol_id}/permisos")
async def cambiar_permisos(
    rol_id: int,
    req: PermisosRol,
    db=Depends(get_db),
    usuario=Depends(require_roles(["ADMINISTRADOR"])),
):
    rol = await db.get(Rol, rol_id)
    if not rol:
        raise ErrorNoEncontrado("Rol", rol_id)
    if rol.nombre == "ADMINISTRADOR":
        raise ErrorReglaNegocio(
            "ADMIN_PROTEGIDO",
            "Se conserva el acceso de administración para evitar bloqueos.",
        )
    if set(req.permisos) - set(CATALOGO) or {"usuarios", "roles"} & set(req.permisos):
        raise ErrorReglaNegocio(
            "PERMISOS_INVALIDOS",
            "La gestión de usuarios y roles es exclusiva del administrador.",
        )
    if rol.nombre == "REPARTIDOR" and set(req.permisos) - {"reparto", "cerrar_pedidos"}:
        raise ErrorReglaNegocio(
            "ROL_REPARTO", "El acceso por placa se limita a su reparto y cierre."
        )
    if rol.nombre != "REPARTIDOR" and "reparto" in req.permisos:
        raise ErrorReglaNegocio("ROL_REPARTO", "El acceso a reparto se reserva a las cuentas por placa.")
    previos = permisos_rol(rol)
    rol.permisos = sorted(set(req.permisos))
    await registrar_auditoria(
        db,
        "ACTUALIZAR",
        "rol",
        rol_id,
        valores_antes={"permisos": previos},
        valores_despues={"permisos": rol.permisos},
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return {"mensaje": "Permisos actualizados", "permisos": rol.permisos}


@router.put("/{usuario_id}")
async def modificar(
    usuario_id: int,
    req: Crear,
    db=Depends(get_db),
    usuario=Depends(require_roles(["ADMINISTRADOR"])),
):
    u = await db.get(Usuario, usuario_id)
    if not u:
        raise ErrorNoEncontrado("Usuario", usuario_id)
    if u.id_vehiculo:
        raise ErrorReglaNegocio(
            "ACCESO_DIARIO", "Gestione el acceso de reparto desde el dashboard."
        )
    if (
        (
            await db.execute(
                select(Usuario).where(
                    Usuario.id_usuario != usuario_id,
                    (
                        (func.lower(Usuario.correo) == req.correo.lower())
                        | (
                            func.lower(Usuario.nombre_usuario)
                            == req.nombre_usuario.lower()
                        )
                    ),
                )
            )
        )
        .scalars()
        .first()
    ):
        raise ErrorReglaNegocio(
            "USUARIO_DUPLICADO", "El usuario o correo ya está registrado."
        )
    r = (
        (await db.execute(select(Rol).where(Rol.nombre == req.rol, Rol.activo == True)))
        .scalars()
        .first()
    )
    if not r or r.nombre == "REPARTIDOR":
        raise ErrorReglaNegocio("ROL_INVALIDO", "Seleccione un rol de oficina.")
    if str(u.id_usuario) == str(usuario["sub"]) and r.nombre != "ADMINISTRADOR":
        raise ErrorReglaNegocio(
            "ADMIN_PROTEGIDO", "Conserve el rol de administrador en su propia cuenta."
        )
    u.nombres = req.nombres
    u.apellidos = req.apellidos
    u.correo = req.correo.lower()
    u.nombre_usuario = req.nombre_usuario.lower()
    u.password_hash = hash_contrasena(req.clave)
    u.id_rol = r.id_rol
    u.version_sesion += 1
    await registrar_auditoria(
        db, "ACTUALIZAR", "usuario", usuario_id, usuario_id=usuario["sub"]
    )
    await db.commit()
    return {"mensaje": "Usuario actualizado y sesiones anteriores revocadas"}
