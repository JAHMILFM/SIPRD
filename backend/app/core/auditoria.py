from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models import Auditoria
from backend.app.core.tiempo import ahora

VALID_ACCIONES = {'CREAR', 'ACTUALIZAR', 'DESACTIVAR', 'CONFIRMAR', 'REPLANIFICAR', 'VALIDAR', 'OBSERVAR'}

async def registrar_auditoria(
    db: AsyncSession,
    accion: str,
    entidad: str,
    entidad_id: Optional[int] = None,
    valores_antes: Optional[Any] = None,
    valores_despues: Optional[Any] = None,
    usuario_id: Optional[str] = None,
    ip: Optional[str] = None,
    request_id: Optional[str] = None
) -> Auditoria:
    """Registra una entrada inmutable en la tabla de auditoría (RNF-TRZ-01)."""
    accion_normalizada = (accion or "ACTUALIZAR").upper()
    if accion_normalizada not in VALID_ACCIONES:
        # Si la acción es LOGIN, LOGOUT u otra no contemplada en el check estricto del backup,
        # la normalizamos a ACTUALIZAR preservando el detalle en valores_despues
        if valores_despues is None:
            valores_despues = {"accion_original": accion}
        elif isinstance(valores_despues, dict):
            valores_despues["accion_original"] = accion
        accion_normalizada = "ACTUALIZAR"

    registro = Auditoria(
        id_usuario=int(usuario_id) if usuario_id is not None else None,
        accion=accion_normalizada,
        entidad=entidad,
        id_entidad=int(entidad_id or 0),
        valor_anterior=valores_antes,
        valor_nuevo=valores_despues,
        fecha_hora=ahora()
    )
    db.add(registro)
    await db.flush()
    return registro
