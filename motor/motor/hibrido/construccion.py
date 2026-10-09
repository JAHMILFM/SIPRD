from typing import List, Tuple, Dict, Any
from motor.motor.modelos import Punto, VehiculoVRP, RutaResultado, NoAsignadoResultado
from motor.motor.hibrido.evaluacion import evaluar_ruta

def construir_solucion_inicial(
    deposito: Punto,
    pedidos: List[Punto],
    vehiculos: List[VehiculoVRP],
    mat_dist: List[List[float]],
    mat_tiempo: List[List[float]],
    mapa_indices: Dict[str, int]
) -> Tuple[List[RutaResultado], List[NoAsignadoResultado]]:
    """
    Heurística de construcción de rutas basada en inserción con balanceo de capacidad y ventanas.
    """
    rutas_resultado: List[RutaResultado] = []
    pedidos_pendientes = list(pedidos)
    no_asignados: List[NoAsignadoResultado] = []

    # Ordenar por prioridad y ventana horaria más temprana
    pedidos_pendientes.sort(key=lambda p: (
        0 if p.prioridad == "Alta" else 1 if p.prioridad == "Media" else 2,
        p.ventana_inicio or "23:59",
        -p.peso_kg
    ))

    # Asignación a vehículos disponibles
    for idx_vehiculo, v in enumerate(vehiculos):
        pedidos_ruta: List[Punto] = []
        peso_acum = 0.0
        vol_acum = 0.0

        i = 0
        while i < len(pedidos_pendientes):
            p = pedidos_pendientes[i]
            if (peso_acum + p.peso_kg <= v.capacidad_peso_kg) and (vol_acum + p.volumen_m3 <= v.capacidad_volumen_m3):
                # Probar si la inserción genera una ruta factible
                candidatos = pedidos_ruta + [p]
                indices = [mapa_indices[x.id] for x in candidatos]
                eval_res = evaluar_ruta(deposito, candidatos, v, mat_dist, mat_tiempo, 0, indices)

                # Si no viola jornada ni ventana estricta, aceptar
                if len(eval_res["infracciones"]) == 0 or len(pedidos_ruta) == 0:
                    pedidos_ruta.append(p)
                    peso_acum += p.peso_kg
                    vol_acum += p.volumen_m3
                    pedidos_pendientes.pop(i)
                    continue
            i += 1

        if pedidos_ruta:
            indices = [mapa_indices[x.id] for x in pedidos_ruta]
            eval_final = evaluar_ruta(deposito, pedidos_ruta, v, mat_dist, mat_tiempo, 0, indices)
            rutas_resultado.append(RutaResultado(
                ruta_id=f"R{idx_vehiculo + 1}",
                vehiculo_id=v.id,
                placa=v.placa,
                paradas=eval_final["paradas"],
                peso_total_kg=eval_final["peso_total_kg"],
                volumen_total_m3=eval_final["volumen_total_m3"],
                distancia_total_km=eval_final["distancia_total_km"],
                duracion_total_min=eval_final["duracion_total_min"],
                salida_almacen=eval_final["salida_almacen"],
                regreso_almacen=eval_final["regreso_almacen"],
                utilizacion_peso_pct=eval_final["utilizacion_peso_pct"],
                utilizacion_vol_pct=eval_final["utilizacion_vol_pct"]
            ))

    # Los que quedaron fuera se marcan con diagnóstico claro
    for p in pedidos_pendientes:
        no_asignados.append(NoAsignadoResultado(
            pedido_id=p.id,
            codigo="CAPACIDAD_FLOTA_INSUFICIENTE",
            motivo=f"No hay vehículos disponibles con capacidad suficiente para este pedido ({p.peso_kg} kg / {p.volumen_m3} m³)."
        ))

    return rutas_resultado, no_asignados
