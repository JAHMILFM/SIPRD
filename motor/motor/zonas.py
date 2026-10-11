"""Zonas operativas de Lima configurables en zonas.json (lon, lat).

Son límites operativos iniciales, no límites administrativos de distritos.
"""

import json
import math
from pathlib import Path
from motor.motor.modelos import SolucionVRP, NoAsignadoResultado
from motor.motor.planificador import optimizar_vrp


def zona_de(lat, lon):
    if (
        lat is None
        or lon is None
        or not math.isfinite(float(lat))
        or not math.isfinite(float(lon))
    ):
        return None
    x, y = float(lon), float(lat)
    zonas = json.loads(Path(__file__).with_name("zonas.json").read_text())
    for nombre, poligono in zonas.items():
        dentro = False
        for i, (x1, y1) in enumerate(poligono):
            x2, y2 = poligono[(i + 1) % len(poligono)]
            if ((y1 > y) != (y2 > y)) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                dentro = not dentro
        if dentro:
            return nombre
    return None


def optimizar_zonas(instancia):
    # Un vehículo pertenece a una sola zona por planificación. Se asigna
    # iterativamente a la zona con más trabajo restante, reservando una unidad
    # por zona activa cuando la flota alcanza para todas las zonas.
    pendientes = {}
    indices = {p.id: i + 1 for i, p in enumerate(instancia.pedidos)}
    no_asignados = []
    for p in instancia.pedidos:
        z = zona_de(p.lat, p.lon)
        if not z:
            no_asignados.append(
                NoAsignadoResultado(
                    pedido_id=p.id,
                    codigo="FUERA_ZONAS",
                    motivo="Coordenadas fuera de las zonas operativas configuradas.",
                )
            )
        else:
            pendientes.setdefault(z, []).append(p)
    rutas = []
    usados = set()
    for v in sorted(
        instancia.vehiculos,
        key=lambda v: (-v.capacidad_peso_kg, -v.capacidad_volumen_m3),
    ):
        activas = [z for z, ps in pendientes.items() if ps]
        if not activas:
            break
        prioridad = [z for z in activas if z not in usados] or activas
        prioridad.sort(
            key=lambda z: (
                -sum(
                    1
                    + p.peso_kg / max(v.capacidad_peso_kg, 1)
                    + p.volumen_m3 / max(v.capacidad_volumen_m3, 1)
                    for p in pendientes[z]
                )
            )
        )
        for z in prioridad:
            update = {"pedidos": pendientes[z], "vehiculos": [v]}
            if instancia.matriz_distancias is not None:
                ix = [0] + [indices[p.id] for p in pendientes[z]]
                update["matriz_distancias"] = [
                    [instancia.matriz_distancias[i][j] for j in ix] for i in ix
                ]
                update["matriz_tiempos"] = [
                    [instancia.matriz_tiempos[i][j] for j in ix] for i in ix
                ]
            sol = optimizar_vrp(instancia.model_copy(update=update))
            if not sol.rutas:
                continue
            for r in sol.rutas:
                r.zona_operativa = z
                r.ruta_id = f"{z} {sum(x.zona_operativa == z for x in rutas) + 1}"
                rutas.append(r)
            asignados = {p.pedido_id for r in sol.rutas for p in r.paradas}
            pendientes[z] = [p for p in pendientes[z] if p.id not in asignados]
            usados.add(z)
            break
    for z, ps in pendientes.items():
        no_asignados.extend(
            NoAsignadoResultado(
                pedido_id=p.id,
                codigo="FLOTA_O_HORARIO",
                motivo=f"No hay capacidad o jornada factible en zona {z}; seleccione más vehículos o revise restricciones.",
            )
            for p in ps
        )
    return SolucionVRP(
        metodo="ZONAS_INSERCION_2OPT",
        rutas=rutas,
        no_asignados=no_asignados,
        total_distancia_km=sum(r.distancia_total_km for r in rutas),
        total_duracion_min=sum(r.duracion_total_min for r in rutas),
        total_pedidos_asignados=sum(len(r.paradas) for r in rutas),
        tiempo_ejecucion_seg=0,
    )
