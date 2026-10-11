from datetime import date, time
from typing import Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorNoEncontrado
from backend.app.core.auditoria import registrar_auditoria
from backend.app.models import RestriccionCliente, Cliente

router = APIRouter(tags=["Restricciones de clientes"])
autorizado = require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"])


@router.get("/restricciones")
async def todas(db=Depends(get_db), usuario=Depends(autorizado)):
    return [
        datos(r)
        for r in (
            await db.execute(
                select(RestriccionCliente).where(RestriccionCliente.activo == True)
            )
        ).scalars()
    ]


class Disponibilidad(BaseModel):
    dias: list[int] | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    fecha_especifica: date | None = None
    tipo_restriccion: Literal["RECIBE", "NO_RECIBE", "VENTANA_HORARIA"] = "RECIBE"

    @model_validator(mode="after")
    def comprobar(self):
        if self.dias is not None and (not self.dias or set(self.dias) - set(range(7))):
            raise ValueError("Seleccione al menos un día válido.")
        if (self.hora_inicio is None) != (self.hora_fin is None) or (
            self.hora_inicio and self.hora_inicio >= self.hora_fin
        ):
            raise ValueError("El intervalo horario no es válido.")
        return self


@router.put("/clientes/{cliente_id}/disponibilidad")
async def disponibilidad(
    cliente_id: int,
    req: Disponibilidad,
    db=Depends(get_db),
    usuario=Depends(autorizado),
):
    if not await db.get(Cliente, cliente_id):
        raise ErrorNoEncontrado("Cliente", cliente_id)
    anteriores = (
        (
            await db.execute(
                select(RestriccionCliente).where(
                    RestriccionCliente.id_cliente == cliente_id,
                    RestriccionCliente.activo == True,
                    RestriccionCliente.tipo_restriccion != "PRIORIDAD",
                    RestriccionCliente.fecha_especifica == req.fecha_especifica,
                )
            )
        )
        .scalars()
        .all()
    )
    for r in anteriores:
        r.activo = False
        await registrar_auditoria(
            db,
            "DESACTIVAR",
            "restriccion_cliente",
            r.id_restriccion,
            usuario_id=usuario["sub"],
        )
    dias = [None] if req.dias is None else [7 if d == 0 else d for d in req.dias]
    # Todos los días sin horario no requieren una restricción positiva.
    if (
        req.dias is not None
        or req.hora_inicio
        or req.fecha_especifica
        or req.tipo_restriccion == "NO_RECIBE"
    ):
        for d in dias:
            r = RestriccionCliente(
                id_cliente=cliente_id,
                tipo_restriccion=req.tipo_restriccion,
                dia_semana=d,
                fecha_especifica=req.fecha_especifica,
                hora_inicio=req.hora_inicio,
                hora_fin=req.hora_fin,
                observacion="Disponibilidad registrada desde SIPRD",
            )
            db.add(r)
            await db.flush()
            await registrar_auditoria(
                db,
                "CREAR",
                "restriccion_cliente",
                r.id_restriccion,
                usuario_id=usuario["sub"],
            )
    await db.commit()
    return {"mensaje": "Disponibilidad guardada"}


class DatosRestriccion(BaseModel):
    tipo_restriccion: Literal["RECIBE", "NO_RECIBE", "PRIORIDAD", "VENTANA_HORARIA"]
    dia_semana: int | None = Field(None, ge=1, le=7)
    fecha_especifica: date | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    observacion: str | None = Field(None, max_length=500)

    @model_validator(mode="after")
    def verificar(self):
        if (self.hora_inicio is None) != (self.hora_fin is None):
            raise ValueError("Indique las dos horas del intervalo.")
        if self.hora_inicio is not None and self.hora_inicio >= self.hora_fin:
            raise ValueError("La hora de fin debe ser posterior al inicio.")
        if not self.dia_semana and not self.fecha_especifica and not self.hora_inicio:
            raise ValueError("Indique día, fecha específica o intervalo horario.")
        return self


def datos(r):
    return {
        k: getattr(r, k)
        for k in [
            "id_restriccion",
            "id_cliente",
            "tipo_restriccion",
            "dia_semana",
            "fecha_especifica",
            "hora_inicio",
            "hora_fin",
            "observacion",
            "activo",
        ]
    }


@router.get("/clientes/{cliente_id}/restricciones")
async def listar(cliente_id: int, db=Depends(get_db), usuario=Depends(autorizado)):
    return [
        datos(r)
        for r in (
            await db.execute(
                select(RestriccionCliente)
                .where(RestriccionCliente.id_cliente == cliente_id)
                .order_by(RestriccionCliente.id_restriccion)
            )
        ).scalars()
    ]


@router.post("/clientes/{cliente_id}/restricciones", status_code=201)
async def crear(
    cliente_id: int,
    req: DatosRestriccion,
    db=Depends(get_db),
    usuario=Depends(autorizado),
):
    if not await db.get(Cliente, cliente_id):
        raise ErrorNoEncontrado("Cliente", cliente_id)
    r = RestriccionCliente(id_cliente=cliente_id, **req.model_dump())
    db.add(r)
    await db.flush()
    await registrar_auditoria(
        db, "CREAR", "restriccion_cliente", r.id_restriccion, usuario_id=usuario["sub"]
    )
    await db.commit()
    return datos(r)


@router.put("/restricciones/{restriccion_id}")
async def actualizar(
    restriccion_id: int,
    req: DatosRestriccion,
    db=Depends(get_db),
    usuario=Depends(autorizado),
):
    r = await db.get(RestriccionCliente, restriccion_id)
    if not r:
        raise ErrorNoEncontrado("Restricción", restriccion_id)
    for k, v in req.model_dump().items():
        setattr(r, k, v)
    await registrar_auditoria(
        db,
        "ACTUALIZAR",
        "restriccion_cliente",
        r.id_restriccion,
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return datos(r)


@router.post("/restricciones/{restriccion_id}/desactivar")
async def desactivar(
    restriccion_id: int, db=Depends(get_db), usuario=Depends(autorizado)
):
    r = await db.get(RestriccionCliente, restriccion_id)
    if not r:
        raise ErrorNoEncontrado("Restricción", restriccion_id)
    r.activo = False
    await registrar_auditoria(
        db,
        "DESACTIVAR",
        "restriccion_cliente",
        r.id_restriccion,
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return datos(r)
