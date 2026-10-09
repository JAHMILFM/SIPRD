from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Punto(BaseModel):
    id: str
    lat: float
    lon: float
    nombre: Optional[str] = None
    tiempo_servicio_min: int = 15
    peso_kg: float = 0.0
    volumen_m3: float = 0.0
    ventana_inicio: Optional[str] = None # "09:00"
    ventana_fin: Optional[str] = None    # "13:00"
    prioridad: Optional[str] = "Media"
    dias_permitidos: Optional[List[int]] = None # [1, 2, 3, 4, 5]

class VehiculoVRP(BaseModel):
    id: str
    placa: str
    capacidad_peso_kg: float
    capacidad_volumen_m3: float
    inicio_jornada: str = "07:30"
    fin_jornada: str = "17:30"
    costo_fijo: float = 50.0

class InstanciaVRP(BaseModel):
    fecha: str
    deposito: Punto
    pedidos: List[Punto]
    vehiculos: List[VehiculoVRP]
    velocidad_kmh: float = 20.0 # Velocidad urbana promedio en Lima

class ParadaResultado(BaseModel):
    secuencia: int
    pedido_id: str
    nombre_cliente: str
    llegada: str
    inicio_atencion: str
    salida: str
    espera_min: float = 0.0
    lat: float
    lon: float

class RutaResultado(BaseModel):
    ruta_id: str
    vehiculo_id: str
    placa: str
    paradas: List[ParadaResultado]
    peso_total_kg: float
    volumen_total_m3: float
    distancia_total_km: float
    duracion_total_min: float
    salida_almacen: str
    regreso_almacen: str
    utilizacion_peso_pct: float
    utilizacion_vol_pct: float

class NoAsignadoResultado(BaseModel):
    pedido_id: str
    codigo: str
    motivo: str

class SolucionVRP(BaseModel):
    metodo: str
    rutas: List[RutaResultado]
    no_asignados: List[NoAsignadoResultado]
    total_distancia_km: float
    total_duracion_min: float
    total_pedidos_asignados: int
    tiempo_ejecucion_seg: float
    infracciones: List[str] = []
