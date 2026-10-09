from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Incidencia, Parada, Pedido, Cliente

router = APIRouter(prefix="/incidencias", tags=["Gestión de Incidencias"])

class ActualizarIncidenciaRequest(BaseModel):
    estado: str # ABIERTA, EN_ATENCION, RESUELTA
    resolucion: Optional[str] = None

@router.get("", response_model=List[dict])
async def listar_incidencias(
    ruta_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    query = select(Incidencia)
    if ruta_id:
        query = query.where(Incidencia.ruta_id == ruta_id)
    if estado:
        query = query.where(Incidencia.estado == estado.upper())

    result = await db.execute(query.order_by(Incidencia.creado_en.desc()))
    incs = result.scalars().all()
    return [
        {
            "id": inc.id,
            "ruta_id": inc.ruta_id,
            "parada_id": inc.parada_id,
            "tipo": inc.tipo,
            "descripcion": inc.descripcion,
            "estado": inc.estado,
            "registrada_por": inc.registrada_por,
            "atendida_por": inc.atendida_por,
            "resolucion": inc.resolucion,
            "creado_en": inc.creado_en
        }
        for inc in incs
    ]

@router.patch("/{id}")
async def actualizar_incidencia(
    id: str,
    req: ActualizarIncidenciaRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    inc = await db.get(Incidencia, id)
    if not inc:
        raise ErrorNoEncontrado("Incidencia", id)

    estado_previo = inc.estado
    inc.estado = req.estado.upper()
    if req.resolucion:
        inc.resolucion = req.resolucion
    inc.atendida_por = usuario["sub"]

    await registrar_auditoria(
        db=db,
        accion="ACTUALIZAR_INCIDENCIA",
        entidad="incidencia",
        entidad_id=inc.id,
        valores_antes={"estado": estado_previo},
        valores_despues={"estado": inc.estado, "resolucion": inc.resolucion},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {"mensaje": "Incidencia actualizada satisfactoriamente"}
