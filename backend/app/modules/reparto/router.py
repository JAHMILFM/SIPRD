import os
from fastapi import APIRouter, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from backend.app.core.db import get_db
from backend.app.core.seguridad import require_roles
from backend.app.core.errores import ErrorReglaNegocio
from backend.app.core.reparto import autorizar_ruta, autorizar_parada
from backend.app.core.almacenamiento import guardar_archivo
from backend.app.core.auditoria import registrar_auditoria
from backend.app.core.tiempo import ahora
from backend.app.core.config import settings
from backend.app.models import (
    Ruta,
    ParadaRuta,
    Pedido,
    Cliente,
    Vehiculo,
    EvidenciaEntrega,
    Incidencia,
    Planificacion,
    Cobro,
)

router = APIRouter(prefix="/reparto", tags=["Reparto"])
auth = require_roles(["REPARTIDOR", "ASISTENTE", "JEFE", "ADMINISTRADOR"])
consulta_evidencias = require_roles(["ASISTENTE", "JEFE", "ADMINISTRADOR"])


@router.get("/mis-rutas")
async def mis_rutas(db=Depends(get_db), usuario=Depends(require_roles(["REPARTIDOR"]))):
    q = (
        select(Ruta)
        .join(Planificacion, Ruta.id_planificacion == Planificacion.id_planificacion)
        .where(
            Ruta.id_vehiculo == usuario["id_vehiculo"],
            Planificacion.fecha_operacion == usuario["fecha_reparto"],
            Planificacion.estado.in_(["CONFIRMADA", "REPLANIFICADA"]),
            Ruta.estado != "CANCELADA",
        )
    )
    return [
        await obtener_ruta(r.id_ruta, db, usuario)
        for r in (await db.execute(q)).scalars()
    ]


@router.get("/ruta/{ruta_id}")
async def obtener_ruta(ruta_id: int, db=Depends(get_db), usuario=Depends(auth)):
    r = await autorizar_ruta(db, ruta_id, usuario)
    v = await db.get(Vehiculo, r.id_vehiculo)
    stops = (
        await db.execute(
            select(ParadaRuta, Pedido, Cliente)
            .join(Pedido, ParadaRuta.id_pedido == Pedido.id_pedido)
            .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
            .where(ParadaRuta.id_ruta == ruta_id, ParadaRuta.estado != "CANCELADA")
            .order_by(ParadaRuta.secuencia)
        )
    ).all()
    ids = [s.id_parada for s, p, c in stops]
    pagos = {}
    fotos = {}
    for pago in (
        await db.execute(select(Cobro).where(Cobro.id_parada.in_(ids)))
    ).scalars():
        pagos.setdefault(pago.id_parada, []).append(pago)
    for foto in (
        await db.execute(
            select(EvidenciaEntrega).where(EvidenciaEntrega.id_parada.in_(ids))
        )
    ).scalars():
        fotos.setdefault(foto.id_parada, []).append(foto)
    data = []
    for s, p, c in stops:
        cobros = pagos.get(s.id_parada, [])
        evidencias = fotos.get(s.id_parada, [])
        validado = sum(float(c.monto) for c in cobros if c.estado == "CONFORME")
        data.append(
            {
                "id": s.id_parada,
                "pedido_id": p.id_pedido,
                "pedido": p.codigo_externo,
                "cliente": c.razon_social,
                "direccion": c.direccion,
                "lat": p.latitud_entrega,
                "lon": p.longitud_entrega,
                "estado": s.estado,
                "secuencia": s.secuencia,
                "eta": s.eta_estimada,
                "importe": float(p.importe_total),
                "validado": validado,
                "porcentaje": min(
                    100, round(100 * validado / float(p.importe_total), 1)
                )
                if p.importe_total
                else 100,
                "cierre_financiero": p.cierre_financiero,
                "evidencias": len(evidencias),
                "cobros": [
                    {
                        "id": c.id_cobro,
                        "monto": float(c.monto),
                        "medio_pago": c.medio_pago,
                        "numero_operacion": c.numero_operacion,
                        "estado": c.estado,
                        "observacion": c.observacion,
                        "tiene_comprobante": bool(c.url_comprobante),
                    }
                    for c in cobros
                ],
            }
        )
    return {
        "ruta_id": r.id_ruta,
        "vehiculo": v.placa,
        "zona": r.zona_operativa,
        "estado": r.estado,
        "duracion_min": r.tiempo_estimado_min,
        "paradas": data,
    }


@router.post("/paradas/{parada_id}/evidencias", status_code=201)
async def evidencia(
    parada_id: int,
    archivo: UploadFile = File(...),
    descripcion: str = Form(""),
    db=Depends(get_db),
    usuario=Depends(auth),
):
    s = await autorizar_parada(db, parada_id, usuario)
    p = (
        (
            await db.execute(
                select(Pedido).where(Pedido.id_pedido == s.id_pedido).with_for_update()
            )
        )
        .scalars()
        .one()
    )
    if p.cierre_financiero:
        raise ErrorReglaNegocio("PEDIDO_CERRADO", "El pedido está cerrado.")
    if archivo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise ErrorReglaNegocio(
            "FOTO_REQUERIDA", "La evidencia de entrega debe ser una fotografía."
        )
    info = await guardar_archivo(archivo, "evidencias")
    e = EvidenciaEntrega(
        id_parada=parada_id,
        url_archivo=info["clave_archivo"],
        nombre_archivo=info["nombre_original"],
        tipo_mime=info["tipo_mime"],
        descripcion=descripcion[:500],
        id_usuario_registro=int(usuario["sub"]),
    )
    db.add(e)
    s.estado = "ATENDIDA"
    s.hora_llegada_real = ahora()
    p.estado = "ENTREGADO"
    await db.flush()
    await registrar_auditoria(
        db,
        "CREAR",
        "evidencia_entrega",
        e.id_evidencia,
        valores_despues={"parada": parada_id},
        usuario_id=usuario["sub"],
    )
    await db.commit()
    return {
        "mensaje": "Entrega registrada. El cierre financiero requiere validación de Tesorería."
    }


@router.get("/paradas/{parada_id}/evidencias")
async def listar_evidencias(
    parada_id: int,
    db=Depends(get_db),
    usuario=Depends(consulta_evidencias),
):
    """Evidencias físicas visibles para Distribución, no para Tesorería."""
    await autorizar_parada(db, parada_id, usuario)
    evidencias = (
        await db.execute(
            select(EvidenciaEntrega)
            .where(EvidenciaEntrega.id_parada == parada_id)
            .order_by(EvidenciaEntrega.fecha_registro.desc())
        )
    ).scalars().all()
    return [
        {
            "id": e.id_evidencia,
            "nombre": e.nombre_archivo,
            "tipo": e.tipo_mime,
            "descripcion": e.descripcion,
            "fecha": e.fecha_registro,
        }
        for e in evidencias
    ]


@router.get("/evidencias/{evidencia_id}/archivo")
async def ver_archivo_evidencia(
    evidencia_id: int,
    db=Depends(get_db),
    usuario=Depends(consulta_evidencias),
):
    evidencia = await db.get(EvidenciaEntrega, evidencia_id)
    if not evidencia:
        raise ErrorReglaNegocio("EVIDENCIA_NO_ENCONTRADA", "La evidencia no existe.")
    await autorizar_parada(db, evidencia.id_parada, usuario)
    base = os.path.abspath(settings.UPLOAD_DIR)
    archivo = os.path.abspath(os.path.join(base, evidencia.url_archivo))
    if not archivo.startswith(base + os.sep) or not os.path.isfile(archivo):
        raise ErrorReglaNegocio("ARCHIVO_NO_DISPONIBLE", "El archivo de evidencia no está disponible.")
    return FileResponse(archivo, media_type=evidencia.tipo_mime, filename=evidencia.nombre_archivo)


@router.post("/paradas/{parada_id}/incidencias", status_code=201)
async def incidencia(
    parada_id: int,
    tipo: str = Form(...),
    descripcion: str = Form(...),
    db=Depends(get_db),
    usuario=Depends(auth),
):
    s = await autorizar_parada(db, parada_id, usuario)
    if s.estado in ("ATENDIDA", "CANCELADA"):
        raise ErrorReglaNegocio(
            "PARADA_NO_EDITABLE", "La parada ya fue atendida o cancelada."
        )
    if tipo not in (
        "CLIENTE_CERRADO",
        "CLIENTE_NO_RECIBE",
        "DIRECCION_INCORRECTA",
        "PEDIDO_RECHAZADO",
        "VEHICULO_RETRASADO",
        "OTRO",
    ):
        raise ErrorReglaNegocio("TIPO_INVALIDO", "Tipo de incidencia no permitido.")
    if not descripcion.strip() or len(descripcion) > 1000:
        raise ErrorReglaNegocio(
            "DESCRIPCION_INVALIDA", "Indique una descripción de hasta 1000 caracteres."
        )
    i = Incidencia(
        id_parada=parada_id,
        tipo=tipo,
        descripcion=descripcion,
        estado="ABIERTA",
        id_usuario_registro=int(usuario["sub"]),
    )
    db.add(i)
    s.estado = "NO_ATENDIDA"
    await db.flush()
    await registrar_auditoria(
        db, "CREAR", "incidencia", i.id_incidencia, usuario_id=usuario["sub"]
    )
    await db.commit()
    return {"mensaje": "Incidencia registrada para Distribución"}
