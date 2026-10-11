from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.models import Auditoria

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])


@router.get("")
async def listar(
    entidad: Optional[str] = Query(None),
    limite: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ADMINISTRADOR", "JEFE"])),
):
    q = select(Auditoria)
    if entidad:
        q = q.where(Auditoria.entidad == entidad)
    filas = (
        (await db.execute(q.order_by(Auditoria.fecha_hora.desc()).limit(limite)))
        .scalars()
        .all()
    )
    return [
        {
            "id": a.id_auditoria,
            "usuario_id": a.id_usuario,
            "accion": a.accion,
            "entidad": a.entidad,
            "entidad_id": a.id_entidad,
            "valor_anterior": a.valor_anterior,
            "valor_nuevo": a.valor_nuevo,
            "fecha_hora": a.fecha_hora,
        }
        for a in filas
    ]
