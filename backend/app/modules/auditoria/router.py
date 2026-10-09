from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.models import Auditoria, Usuario

router = APIRouter(prefix="/auditoria", tags=["Auditoría y Trazabilidad"])

@router.get("", response_model=List[dict])
async def consultar_auditoria(
    entidad: Optional[str] = Query(None),
    entidad_id: Optional[str] = Query(None),
    usuario_id: Optional[str] = Query(None),
    limite: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_roles(["ADMINISTRADOR", "JEFE"]))
):
    """Consulta la bitácora inmutable de auditoría del sistema (RNF-TRZ-01)."""
    query = select(Auditoria)
    if entidad:
        query = query.where(Auditoria.entidad == entidad.lower())
    if entidad_id:
        query = query.where(Auditoria.entidad_id == entidad_id)
    if usuario_id:
        query = query.where(Auditoria.usuario_id == usuario_id)

    result = await db.execute(query.order_by(Auditoria.fecha.desc()).limit(limite))
    registros = result.scalars().all()
    return [
        {
            "id": a.id,
            "usuario_id": a.usuario_id,
            "accion": a.accion,
            "entidad": a.entidad,
            "entidad_id": a.entidad_id,
            "valores_antes": a.valores_antes,
            "valores_despues": a.valores_despues,
            "ip": a.ip,
            "request_id": a.request_id,
            "fecha": a.fecha
        }
        for a in registros
    ]
