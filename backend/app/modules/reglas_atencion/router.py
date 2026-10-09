from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, List
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado, ErrorReglaNegocio
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import ReglaAtencion, Cliente

router = APIRouter(tags=["Reglas de Atención de Clientes"])

class ReglaCreate(BaseModel):
    tipo: str # DIAS_DISPONIBLES, DIAS_NO_DISPONIBLES, INTERVALO_HORARIO
    dias: Optional[List[int]] = None # [1, 2, 3, 4, 5]
    fecha: Optional[str] = None
    hora_inicio: Optional[str] = None # "09:00"
    hora_fin: Optional[str] = None # "13:00"
    vigente_desde: Optional[str] = None
    vigente_hasta: Optional[str] = None

@router.get("/clientes/{cliente_id}/reglas-atencion", response_model=List[dict])
async def listar_reglas_cliente(
    cliente_id: str,
    vigentes: Optional[bool] = Query(True),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    query = select(ReglaAtencion).where(ReglaAtencion.cliente_id == cliente_id)
    if vigentes:
        query = query.where(ReglaAtencion.activo == True)
    result = await db.execute(query)
    reglas = result.scalars().all()
    return [
        {
            "id": r.id,
            "cliente_id": r.cliente_id,
            "tipo": r.tipo,
            "dias": r.dias,
            "fecha": r.fecha,
            "hora_inicio": r.hora_inicio,
            "hora_fin": r.hora_fin,
            "vigente_desde": r.vigente_desde,
            "vigente_hasta": r.vigente_hasta,
            "activo": r.activo
        }
        for r in reglas
    ]

@router.post("/clientes/{cliente_id}/reglas-atencion", status_code=status.HTTP_201_CREATED)
async def crear_regla_cliente(
    cliente_id: str,
    req: ReglaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    cliente = await db.get(Cliente, cliente_id)
    if not cliente:
        raise ErrorNoEncontrado("Cliente", cliente_id)

    # Validar intervalo horario si aplica (hora_fin > hora_inicio)
    if req.tipo == "INTERVALO_HORARIO" or (req.hora_inicio and req.hora_fin):
        if not (req.hora_inicio and req.hora_fin):
            raise ErrorReglaNegocio("INTERVALO_INCOMPLETO", "Debe proporcionar hora_inicio y hora_fin para la ventana horaria")
        if req.hora_inicio >= req.hora_fin:
            raise ErrorReglaNegocio("HORA_FIN_INVALIDA", f"La hora de fin ({req.hora_fin}) debe ser posterior a la hora de inicio ({req.hora_inicio})")

    nueva = ReglaAtencion(
        cliente_id=cliente_id,
        tipo=req.tipo,
        dias=req.dias,
        fecha=req.fecha,
        hora_inicio=req.hora_inicio,
        hora_fin=req.hora_fin,
        vigente_desde=req.vigente_desde,
        vigente_hasta=req.vigente_hasta,
        activo=True
    )
    db.add(nueva)
    await db.flush()

    await registrar_auditoria(
        db=db,
        accion="CREAR_REGLA_ATENCION",
        entidad="regla_atencion",
        entidad_id=nueva.id,
        valores_despues={"tipo": nueva.tipo, "cliente_id": cliente_id},
        usuario_id=usuario["sub"]
    )
    await db.commit()

    return {"id": nueva.id, "mensaje": "Regla de atención configurada exitosamente"}

@router.post("/reglas-atencion/{id}/desactivar")
async def desactivar_regla(
    id: str,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"]))
):
    r = await db.get(ReglaAtencion, id)
    if not r:
        raise ErrorNoEncontrado("ReglaAtencion", id)
    r.activo = False
    await registrar_auditoria(
        db=db,
        accion="DESACTIVAR_REGLA_ATENCION",
        entidad="regla_atencion",
        entidad_id=r.id,
        usuario_id=usuario["sub"]
    )
    await db.commit()
    return {"mensaje": "Regla desactivada"}
