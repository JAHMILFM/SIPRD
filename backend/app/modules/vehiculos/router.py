from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Vehiculo

router = APIRouter(prefix="/vehiculos", tags=["Gestión de Vehículos"])

class VehiculoCreate(BaseModel):
    model_config = {"str_strip_whitespace": True}
    placa: str = Field(min_length=3,max_length=20)
    marca: Optional[str] = None
    modelo: Optional[str] = None
    conductor: Optional[str] = None
    capacidad_peso_kg: float = Field(..., gt=0, description="Capacidad en kilogramos")
    capacidad_volumen_m3: float = Field(..., gt=0, description="Capacidad en metros cúbicos")
    estado: Literal["DISPONIBLE","ASIGNADO","MANTENIMIENTO","INACTIVO"] = "DISPONIBLE"
    inicio_jornada: str = "07:30"
    fin_jornada: str = "17:30"

class VehiculoUpdate(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    conductor: Optional[str] = None
    capacidad_peso_kg: Optional[float] = Field(None, gt=0)
    capacidad_volumen_m3: Optional[float] = Field(None, gt=0)
    estado_operativo: Optional[str] = None
    inicio_jornada: Optional[str] = None
    fin_jornada: Optional[str] = None

@router.get("", response_model=List[dict])
async def listar_vehiculos(
    disponibles: Optional[bool] = Query(None, description="Filtrar solo vehículos operativos y activos"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"]))
):
    query = select(Vehiculo)
    if disponibles is True:
        query = query.where(Vehiculo.activo == True, Vehiculo.estado.in_(["DISPONIBLE", "ASIGNADO"]))
    
    result = await db.execute(query)
    vehiculos = result.scalars().all()
    return [
        {
            "id": v.id,
            "id_vehiculo": v.id,
            "placa": v.placa,
            "marca": v.marca,
            "modelo": v.modelo,
            "conductor": v.conductor,
            "capacidad_peso_kg": v.capacidad_peso_kg,
            "capacidad_kg": v.capacidad_peso_kg,
            "pesoMax": round(v.capacidad_peso_kg / 1000.0, 2),
            "capacidad_volumen_m3": v.capacidad_volumen_m3,
            "capacidad_m3": v.capacidad_volumen_m3,
            "volMax": v.capacidad_volumen_m3,
            "estado_operativo": v.estado_operativo,
            "estado": v.estado,
            "inicio_jornada": v.inicio_jornada,
            "fin_jornada": v.fin_jornada,
            "activo": v.activo
        }
        for v in vehiculos
    ]

@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_vehiculo(
    req: VehiculoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"]))
):
    # Validar placa única
    existente = await db.execute(select(Vehiculo).where(Vehiculo.placa == req.placa.upper().strip()))
    if existente.scalars().first():
        raise ErrorReglaNegocio("PLACA_DUPLICADA", f"Ya existe un vehículo registrado con la placa {req.placa}")

    nuevo = Vehiculo(
        placa=req.placa.upper().strip(),
        marca=req.marca,
        modelo=req.modelo,
        conductor=req.conductor,
        capacidad_peso_kg=req.capacidad_peso_kg,
        capacidad_volumen_m3=req.capacidad_volumen_m3,
        inicio_jornada=req.inicio_jornada,
        fin_jornada=req.fin_jornada,
        estado=req.estado,
        activo=req.estado in ["DISPONIBLE","ASIGNADO"]
    )
    db.add(nuevo)
    await db.flush()

    await registrar_auditoria(
        db=db,
        accion="CREAR_VEHICULO",
        entidad="vehiculo",
        entidad_id=nuevo.id,
        valores_despues={"placa": nuevo.placa, "capacidad_kg": nuevo.capacidad_peso_kg},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {"id": nuevo.id, "mensaje": "Vehículo registrado exitosamente"}

@router.post("/{id}/desactivar")
async def desactivar_vehiculo(
    id: str,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"]))
):
    v = await db.get(Vehiculo, id)
    if not v:
        raise ErrorNoEncontrado("Vehiculo", id)

    estado_prev = v.activo
    v.activo = False
    v.estado_operativo = "FUERA_DE_SERVICIO"

    await registrar_auditoria(
        db=db,
        accion="DESACTIVAR_VEHICULO",
        entidad="vehiculo",
        entidad_id=v.id,
        valores_antes={"activo": estado_prev},
        valores_despues={"activo": False},
        usuario_id=usuario["sub"]
    )
    await db.commit()
    return {"mensaje": f"Vehículo {v.placa} desactivado"}
