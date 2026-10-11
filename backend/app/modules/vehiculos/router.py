from fastapi import APIRouter, Depends, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Literal
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Vehiculo

router = APIRouter(prefix="/vehiculos", tags=["Vehículos"])


class Crear(BaseModel):
    codigo_externo: str
    placa: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    capacidad_kg: float = Field(gt=0, allow_inf_nan=False)
    capacidad_m3: float = Field(gt=0, allow_inf_nan=False)
    estado_operativo: Literal["DISPONIBLE", "MANTENIMIENTO", "INACTIVO"] = "DISPONIBLE"
    activo: bool = True


@router.get("")
async def listar(
    disponibles: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"])),
):
    q = select(Vehiculo)
    if disponibles:
        q = q.where(Vehiculo.activo == True, Vehiculo.estado_operativo == "DISPONIBLE")
    return [
        {
            "id": v.id_vehiculo,
            "codigo_externo": v.codigo_externo,
            "placa": v.placa,
            "marca": v.marca,
            "modelo": v.modelo,
            "capacidad_kg": float(v.capacidad_kg),
            "capacidad_m3": float(v.capacidad_m3),
            "estado_operativo": v.estado_operativo,
            "activo": v.activo,
        }
        for v in (await db.execute(q)).scalars()
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear(
    req: Crear,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"])),
):
    if (
        (
            await db.execute(
                select(Vehiculo).where(
                    (func.upper(Vehiculo.placa) == req.placa.upper())
                    | (Vehiculo.codigo_externo == req.codigo_externo)
                )
            )
        )
        .scalars()
        .first()
    ):
        raise ErrorReglaNegocio("PLACA_DUPLICADA", "La placa ya existe.")
    v = Vehiculo(
        **{**req.model_dump(), "placa": req.placa.upper()},
    )
    db.add(v)
    await db.flush()
    await registrar_auditoria(
        db, "CREAR", "vehiculo", v.id_vehiculo, usuario_id=usuario["sub"]
    )
    await db.commit()
    return {"id": v.id_vehiculo, "mensaje": "Vehículo registrado"}


@router.post("/{vehiculo_id}/desactivar")
async def desactivar(
    vehiculo_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"])),
):
    v = await db.get(Vehiculo, vehiculo_id)
    if not v:
        raise ErrorNoEncontrado("Vehículo", vehiculo_id)
    v.activo = False
    v.estado_operativo = "INACTIVO"
    await registrar_auditoria(
        db, "DESACTIVAR", "vehiculo", vehiculo_id, usuario_id=usuario["sub"]
    )
    await db.commit()
    return {"mensaje": "Vehículo desactivado"}


@router.put("/{vehiculo_id}")
async def actualizar(
    vehiculo_id: int,
    req: Crear,
    db=Depends(get_db),
    usuario=Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"])),
):
    v = await db.get(Vehiculo, vehiculo_id)
    if not v:
        raise ErrorNoEncontrado("Vehículo", vehiculo_id)
    if (
        (
            await db.execute(
                select(Vehiculo).where(
                    Vehiculo.id_vehiculo != vehiculo_id,
                    (
                        (func.upper(Vehiculo.placa) == req.placa.upper())
                        | (Vehiculo.codigo_externo == req.codigo_externo)
                    ),
                )
            )
        )
        .scalars()
        .first()
    ):
        raise ErrorReglaNegocio("PLACA_DUPLICADA", "La placa o código ya existe.")
    from backend.app.models import Usuario

    u = (
        (await db.execute(select(Usuario).where(Usuario.id_vehiculo == vehiculo_id)))
        .scalars()
        .first()
    )
    if u:
        u.nombre_usuario = req.placa.upper()
    for k, val in req.model_dump().items():
        setattr(v, k, val.upper() if k == "placa" else val)
    await registrar_auditoria(
        db, "ACTUALIZAR", "vehiculo", vehiculo_id, usuario_id=usuario["sub"]
    )
    await db.commit()
    return {"mensaje": "Vehículo actualizado"}
