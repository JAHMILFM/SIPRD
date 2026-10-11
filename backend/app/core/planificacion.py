from sqlalchemy import select
from backend.app.models import RestriccionCliente
from motor.motor.modelos import Punto, VehiculoVRP
from motor.motor.zonas import zona_de

DEPOSITO = Punto(id="ALMACEN", nombre="Almacén Lurín", lat=-12.2748, lon=-76.8711)


def minuto(t):
    return t.hour * 60 + t.minute


def intervalos(reglas, fecha, inicio=450, fin=1050):
    aplican = [
        r
        for r in reglas
        if r.activo
        and (
            r.fecha_especifica == fecha
            if r.fecha_especifica
            else r.dia_semana in (None, fecha.isoweekday())
        )
    ]
    positivos = [r for r in reglas if r.activo and r.tipo_restriccion == "RECIBE"]
    if positivos and not any(r.tipo_restriccion == "RECIBE" for r in aplican):
        return []
    ventanas = [
        r for r in aplican if r.tipo_restriccion in ("RECIBE", "VENTANA_HORARIA")
    ]
    slots = (
        [
            (
                max(inicio, minuto(r.hora_inicio)) if r.hora_inicio else inicio,
                min(fin, minuto(r.hora_fin)) if r.hora_fin else fin,
            )
            for r in ventanas
        ]
        if ventanas
        else [(inicio, fin)]
    )
    slots = sorted((a, b) for a, b in slots if a < b)
    merged = []
    for a, b in slots:
        if merged and a <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(b, merged[-1][1]))
        else:
            merged.append((a, b))
    for r in aplican:
        if r.tipo_restriccion != "NO_RECIBE":
            continue
        a, b = (
            (minuto(r.hora_inicio), minuto(r.hora_fin)) if r.hora_inicio else (0, 1440)
        )
        merged = [
            piece
            for x, y in merged
            for piece in ((x, min(y, a)), (max(x, b), y))
            if piece[0] < piece[1]
        ]
    return [list(s) for s in merged]


async def punto_pedido(db, p, c, fecha, reglas=None):
    z = zona_de(p.latitud_entrega, p.longitud_entrega)
    if not z:
        return (
            None,
            "El pedido no tiene coordenadas válidas dentro de las zonas operativas.",
        )
    if reglas is None:
        reglas = (
            (
                await db.execute(
                    select(RestriccionCliente).where(
                        RestriccionCliente.id_cliente == p.id_cliente
                    )
                )
            )
            .scalars()
            .all()
        )
    slots = intervalos(reglas, fecha)
    if not slots:
        return None, "El cliente no recibe en la fecha o los horarios configurados."
    punto = Punto(
        id=str(p.id_pedido),
        nombre=c.razon_social,
        lat=float(p.latitud_entrega),
        lon=float(p.longitud_entrega),
        peso_kg=float(p.peso_kg),
        volumen_m3=float(p.volumen_m3),
        intervalos_recepcion=slots,
        prioridad="Alta"
        if any(r.activo and r.tipo_restriccion == "PRIORIDAD" for r in reglas)
        else "Media",
    )
    return punto, None


def vehiculo_motor(v):
    return VehiculoVRP(
        id=str(v.id_vehiculo),
        placa=v.placa,
        capacidad_peso_kg=float(v.capacidad_kg),
        capacidad_volumen_m3=float(v.capacidad_m3),
    )
