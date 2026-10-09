from typing import List, Dict
from motor.motor.modelos import Punto, VehiculoVRP, RutaResultado
from motor.motor.hibrido.evaluacion import evaluar_ruta

def optimizar_2opt(
    deposito: Punto,
    pedidos: List[Punto],
    vehiculo: VehiculoVRP,
    mat_dist: List[List[float]],
    mat_tiempo: List[List[float]],
    mapa_indices: Dict[str, int]
) -> List[Punto]:
    """Aplica 2-opt intra-ruta para desenredar cruces y minimizar distancia."""
    if len(pedidos) < 4:
        return pedidos

    mejor_secuencia = list(pedidos)
    indices = [mapa_indices[x.id] for x in mejor_secuencia]
    mejor_costo = evaluar_ruta(deposito, mejor_secuencia, vehiculo, mat_dist, mat_tiempo, 0, indices)["distancia_total_km"]

    mejora = True
    iteracion = 0
    while mejora and iteracion < 50:
        mejora = False
        iteracion += 1
        for i in range(len(mejor_secuencia) - 1):
            for k in range(i + 1, len(mejor_secuencia)):
                candidata = mejor_secuencia[:i] + mejor_secuencia[i:k+1][::-1] + mejor_secuencia[k+1:]
                candidata_indices = [mapa_indices[x.id] for x in candidata]
                eval_cand = evaluar_ruta(deposito, candidata, vehiculo, mat_dist, mat_tiempo, 0, candidata_indices)
                
                # Criterio: menor distancia y sin infringir ventanas
                if eval_cand["distancia_total_km"] < mejor_costo - 0.05 and len(eval_cand["infracciones"]) == 0:
                    mejor_secuencia = candidata
                    mejor_costo = eval_cand["distancia_total_km"]
                    mejora = True
                    break
            if mejora:
                break

    return mejor_secuencia
