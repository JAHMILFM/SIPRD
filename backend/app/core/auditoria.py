from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models import Auditoria
from backend.app.core.tiempo import ahora

async def registrar_auditoria(
    db: AsyncSession,
    accion: str,
    entidad: str,
    entidad_id: Optional[str] = None,
    valores_antes: Optional[Any] = None,
    valores_despues: Optional[Any] = None,
    usuario_id: Optional[str] = None,
    ip: Optional[str] = None,
    request_id: Optional[str] = None
) -> Auditoria:
    """Registra una entrada inmutable en la tabla de auditoría (RNF-TRZ-01)."""
    registro = Auditoria(
        usuario_id=usuario_id,
        accion=accion,
        entidad=entidad,
        entidad_id=str(entidad_id) if entidad_id else None,
        valores_antes=valores_antes,
        valores_despues=valores_despues,
        ip=ip,
        request_id=request_id,
        fecha=ahora()
    )
    db.add(registro)
    await db.flush()
    return registro
