from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado
from backend.app.models import Cliente

router = APIRouter(prefix="/clientes", tags=["Clientes y Reglas de Atención"])


@router.get("", response_model=List[dict])
async def listar_clientes(
    q: Optional[str] = Query(None, description="Búsqueda por nombre o distrito"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"])),
):
    query = select(Cliente)
    if q:
        query = query.where(
            (Cliente.razon_social.ilike(f"%{q}%"))
            | (Cliente.distrito.ilike(f"%{q}%"))
            | (Cliente.codigo_externo.ilike(f"%{q}%"))
        )
    result = await db.execute(query.order_by(Cliente.razon_social).limit(1000))
    clientes = result.scalars().all()
    return [
        {
            "id": c.id,
            "codigo_externo": c.codigo_externo,
            "nombre": c.nombre,
            "direccion": c.direccion,
            "distrito": c.distrito,
            "lat": c.lat,
            "lon": c.lon,
        }
        for c in clientes
    ]


@router.get("/{id}")
async def obtener_cliente(
    id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"])),
):
    c = await db.get(Cliente, id)
    if not c:
        raise ErrorNoEncontrado("Cliente", id)
    return {
        "id": c.id,
        "codigo_externo": c.codigo_externo,
        "nombre": c.nombre,
        "direccion": c.direccion,
        "distrito": c.distrito,
        "lat": c.lat,
        "lon": c.lon,
    }
