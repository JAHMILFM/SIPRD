import math
from typing import List, Tuple
from motor.motor.modelos import Punto

FACTOR_CIRCUITO_LIMA = 1.35 # Factor de tortuosidad vial en Lima Metropolitana
VELOCIDAD_PROMEDIO_KMH = 18.0 # Velocidad urbana en hora pico/valle

def distancia_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia geodésica corregida por factor de red vial urbana (km)."""
    R = 6371.0 # Radio de la Tierra en km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distancia_linea_recta = R * c
    return round(distancia_linea_recta * FACTOR_CIRCUITO_LIMA, 2)

def tiempo_viaje_minutos(distancia_km: float, velocidad_kmh: float = VELOCIDAD_PROMEDIO_KMH) -> float:
    """Calcula el tiempo de viaje estimado en minutos."""
    horas = distancia_km / max(5.0, velocidad_kmh)
    return round(horas * 60.0, 1)

def matriz_distancias_tiempos(puntos: List[Punto], velocidad_kmh: float = VELOCIDAD_PROMEDIO_KMH) -> Tuple[List[List[float]], List[List[float]]]:
    """Genera la matriz N x N de distancias (km) y tiempos de viaje (min)."""
    n = len(puntos)
    mat_dist = [[0.0] * n for _ in range(n)]
    mat_tiempo = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i != j:
                d = distancia_haversine(puntos[i].lat, puntos[i].lon, puntos[j].lat, puntos[j].lon)
                t = tiempo_viaje_minutos(d, velocidad_kmh)
                mat_dist[i][j] = d
                mat_tiempo[i][j] = t

    return mat_dist, mat_tiempo
