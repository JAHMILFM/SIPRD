"""Matrices y trazados viales; fallback explícito cuando OSRM no responde."""

import httpx
from backend.app.core.config import settings
from motor.motor.matriz import matriz_distancias_tiempos

_cache = {}


async def matrices(puntos):
    coords = ";".join(f"{p.lon},{p.lat}" for p in puntos)
    if coords in _cache:
        return _cache[coords]
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.get(
                f"{settings.OSRM_URL}/table/v1/driving/{coords}",
                params={"annotations": "distance,duration"},
            )
            res.raise_for_status()
            data = res.json()
        if data["code"] != "Ok" or any(
            x is None for row in data["durations"] for x in row
        ):
            raise ValueError("Matriz incompleta")
        dist = [[x / 1000 for x in row] for row in data["distances"]]
        # Margen operativo urbano. No representa tráfico observado en vivo.
        tiempos = [[x / 60 * 1.4 for x in row] for row in data["durations"]]
        result = (dist, tiempos, "OSRM · tiempos estimados con margen urbano")
        if len(_cache) > 12:
            _cache.clear()
        _cache[coords] = result
        return result
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        dist, tiempos = matriz_distancias_tiempos(puntos, 25)
        return dist, tiempos, "Estimación geográfica · servicio vial no disponible"


async def trazado(coords):
    raw = ";".join(f"{lon},{lat}" for lat, lon in coords)
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.get(
                f"{settings.OSRM_URL}/route/v1/driving/{raw}",
                params={"geometries": "geojson", "overview": "full"},
            )
            res.raise_for_status()
            data = res.json()
        return {
            "coordenadas": [
                [lat, lon] for lon, lat in data["routes"][0]["geometry"]["coordinates"]
            ],
            "fuente": "OSRM",
        }
    except (httpx.HTTPError, ValueError, KeyError, IndexError):
        return {
            "coordenadas": coords,
            "fuente": "Línea de referencia · trazado vial no disponible",
        }
