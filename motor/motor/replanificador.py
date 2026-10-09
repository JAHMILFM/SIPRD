from typing import List, Dict, Any, Optional
from motor.motor.modelos import Punto, VehiculoVRP, SolucionVRP
from motor.motor.planificador import optimizar_vrp, InstanciaVRP

def replanificar_operacion(
    deposito: Punto,
    pedidos_pendientes: List[Punto],
    vehiculos_activos: List[VehiculoVRP],
    hora_actual: str = "12:00",
    fecha: str = "27/08/2026"
) -> SolucionVRP:
    """
    Replanifica las paradas pendientes a partir de la hora actual
    excluyendo vehículos averiados o fuera de servicio.
    """
    # Ajustar inicio de jornada de los vehículos activos a la hora del corte de replanificación
    vehiculos_ajustados = []
    for v in vehiculos_activos:
        v_copia = v.copy()
        v_copia.inicio_jornada = hora_actual
        vehiculos_ajustados.append(v_copia)

    instancia = InstanciaVRP(
        fecha=fecha,
        deposito=deposito,
        pedidos=pedidos_pendientes,
        vehiculos=vehiculos_ajustados
    )

    solucion = optimizar_vrp(instancia, metodo="REPLANIFICACION_DINAMICA")
    return solucion
