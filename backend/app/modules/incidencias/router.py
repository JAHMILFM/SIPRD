from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Literal
from typing import Optional, List
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import Incidencia, Parada, Pedido, Cliente

router = APIRouter(prefix="/incidencias", tags=["Gestión de Incidencias"])

class ActualizarIncidenciaRequest(BaseModel):
    estado: Literal["ABIERTA", "EN_REVISION", "RESUELTA", "CANCELADA"]
    resolucion: Optional[str] = Field(default=None,max_length=1000)

@router.get("", response_model=List[dict])
async def listar_incidencias(
    ruta_id: Optional[int] = Query(None, gt=0),
    estado: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"]))
):
    query = select(Incidencia, Parada.id_ruta, Pedido.codigo_externo, Cliente.razon_social).join(Parada, Incidencia.id_parada == Parada.id_parada).join(Pedido, Parada.id_pedido == Pedido.id_pedido).join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
    if ruta_id:
        query = query.where(Parada.id_ruta == ruta_id)
    if estado:
        query = query.where(Incidencia.estado == estado.upper())

    result = await db.execute(query.order_by(Incidencia.creado_en.desc()))
    incs = result.all()
    return [
        {
            "id": inc.id,
            "ruta_id": str(id_ruta),
            "codigo_pedido": codigo_pedido,
            "cliente": cliente,
            "parada_id": inc.parada_id,
            "tipo": inc.tipo,
            "descripcion": inc.descripcion,
            "estado": inc.estado,
            "registrada_por": inc.registrada_por,
            "atendida_por": inc.atendida_por,
            "resolucion": inc.resolucion,
            "creado_en": inc.creado_en
        }
        for inc, id_ruta, codigo_pedido, cliente in incs
    ]

@router.patch("/{id}")
async def actualizar_incidencia(
    id: str,
    req: ActualizarIncidenciaRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE"]))
):
    inc = await db.get(Incidencia, id)
    if not inc:
        raise ErrorNoEncontrado("Incidencia", id)

    if req.estado == "RESUELTA" and not (req.resolucion or "").strip():
        raise HTTPException(422,"Indica cómo se resolvió la incidencia")
    estado_previo = inc.estado
    inc.estado = req.estado.upper()
    if req.resolucion:
        inc.resolucion = req.resolucion
    inc.atendida_por = int(usuario["sub"])

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
