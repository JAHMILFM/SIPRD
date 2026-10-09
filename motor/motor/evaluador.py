from typing import List, Dict, Any
from motor.motor.modelos import Punto, VehiculoVRP, RutaResultado, ParadaResultado
from motor.motor.matriz import matriz_distancias_tiempos
from motor.motor.hibrido.evaluacion import evaluar_ruta

def evaluar_rutas_manuales(
    deposito: Punto,
    rutas_manuales: List[Dict[str, Any]],
    vehiculos: List[VehiculoVRP],
    pedidos_todos: List[Punto],
    velocidad_kmh: float = 18.0
) -> Dict[str, Any]:
    """
    Evalúa un plan editado manualmente (arrastrar/soltar pedidos entre vehículos o reordenar).
    Calcula horarios y detecta cualquier infracción de capacidad, ventana o jornada.
    """
    mapa_pedidos = {p.id: p for p in pedidos_todos}
    mapa_vehiculos = {v.id: v for v in vehiculos}
    todos_puntos = [deposito] + pedidos_todos
    mapa_indices = {p.id: idx for idx, p in enumerate(todos_puntos)}

    mat_dist, mat_tiempo = matriz_distancias_tiempos(todos_puntos, velocidad_kmh)

    rutas_evaluadas = []
    todas_infracciones = []

    for r_raw in rutas_manuales:
        vehiculo_id = r_raw.get("vehiculo_id")
        v = mapa_vehiculos.get(vehiculo_id)
        if not v:
            continue

        pedidos_ids = r_raw.get("pedidos_ids", [])
        pedidos_secuencia = [mapa_pedidos[pid] for pid in pedidos_ids if pid in mapa_pedidos]
        indices = [mapa_indices[p.id] for p in pedidos_secuencia]

        eval_res = evaluar_ruta(deposito, pedidos_secuencia, v, mat_dist, mat_tiempo, 0, indices)

        if eval_res["infracciones"]:
            for inf in eval_res["infracciones"]:
                todas_infracciones.append(f"Vehículo {v.placa}: {inf}")

        rutas_evaluadas.append({
            "ruta_id": r_raw.get("ruta_id", f"R-{v.placa}"),
            "vehiculo_id": v.id,
            "placa": v.placa,
            "paradas": [p.dict() for p in eval_res["paradas"]],
            "peso_total_kg": eval_res["peso_total_kg"],
            "volumen_total_m3": eval_res["volumen_total_m3"],
            "distancia_total_km": eval_res["distancia_total_km"],
            "duracion_total_min": eval_res["duracion_total_min"],
            "salida_almacen": eval_res["salida_almacen"],
            "regreso_almacen": eval_res["regreso_almacen"],
            "utilizacion_peso_pct": eval_res["utilizacion_peso_pct"],
            "utilizacion_vol_pct": eval_res["utilizacion_vol_pct"]
        })

    return {
        "rutas": rutas_evaluadas,
        "infracciones": todas_infracciones,
        "es_factible": len(todas_infracciones) == 0
    }
