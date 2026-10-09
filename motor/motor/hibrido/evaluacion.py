from typing import List, Tuple, Dict, Any
from motor.motor.modelos import Punto, VehiculoVRP, ParadaResultado
from motor.motor.reglas import parse_hhmm_a_minutos, formatear_minutos_a_hhmm

def evaluar_ruta(
    deposito: Punto,
    secuencia_pedidos: List[Punto],
    vehiculo: VehiculoVRP,
    mat_dist: List[List[float]],
    mat_tiempo: List[List[float]],
    indice_deposito: int = 0,
    indices_pedidos: List[int] = None
) -> Dict[str, Any]:
    """
    Evalúa una ruta secuencial completa calculando distancias, tiempos de viaje,
    ventanas horarias, esperas y uso de capacidad de peso y volumen.
    """
    peso_total = sum(p.peso_kg for p in secuencia_pedidos)
    vol_total = sum(p.volumen_m3 for p in secuencia_pedidos)

    hora_salida_almacen_min = parse_hhmm_a_minutos(vehiculo.inicio_jornada) or (7 * 60 + 30)
    hora_fin_jornada_min = parse_hhmm_a_minutos(vehiculo.fin_jornada) or (17 * 60 + 30)

    tiempo_actual = float(hora_salida_almacen_min)
    distancia_acumulada_km = 0.0
    espera_total_min = 0.0
    paradas: List[ParadaResultado] = []
    infracciones: List[str] = []

    # Validar capacidades
    if peso_total > vehiculo.capacidad_peso_kg:
        infracciones.append(f"Exceso de peso: {peso_total:.1f} kg > {vehiculo.capacidad_peso_kg:.1f} kg")
    if vol_total > vehiculo.capacidad_volumen_m3:
        infracciones.append(f"Exceso de volumen: {vol_total:.2f} m³ > {vehiculo.capacidad_volumen_m3:.2f} m³")

    nodo_actual_idx = indice_deposito

    for i, p in enumerate(secuencia_pedidos):
        nodo_destino_idx = indices_pedidos[i] if indices_pedidos else (i + 1)
        dist_tramo = mat_dist[nodo_actual_idx][nodo_destino_idx]
        tiempo_viaje = mat_tiempo[nodo_actual_idx][nodo_destino_idx]

        distancia_acumulada_km += dist_tramo
        llegada_min = tiempo_actual + tiempo_viaje

        # Ventana horaria
        v_inicio = parse_hhmm_a_minutos(p.ventana_inicio)
        v_fin = parse_hhmm_a_minutos(p.ventana_fin)

        espera_parada = 0.0
        if v_inicio and llegada_min < v_inicio:
            espera_parada = v_inicio - llegada_min
            inicio_atencion_min = float(v_inicio)
        else:
            inicio_atencion_min = llegada_min

        if v_fin and inicio_atencion_min > v_fin:
            infracciones.append(f"Ventana vencida en pedido {p.id}: llegada {formatear_minutos_a_hhmm(inicio_atencion_min)} > fin {p.ventana_fin}")

        salida_min = inicio_atencion_min + p.tiempo_servicio_min
        espera_total_min += espera_parada
        tiempo_actual = salida_min
        nodo_actual_idx = nodo_destino_idx

        paradas.append(ParadaResultado(
            secuencia=i + 1,
            pedido_id=p.id,
            nombre_cliente=p.nombre or p.id,
            llegada=formatear_minutos_a_hhmm(llegada_min),
            inicio_atencion=formatear_minutos_a_hhmm(inicio_atencion_min),
            salida=formatear_minutos_a_hhmm(salida_min),
            espera_min=round(espera_parada, 1),
            lat=p.lat,
            lon=p.lon
        ))

    # Regreso al depósito
    dist_retorno = mat_dist[nodo_actual_idx][indice_deposito]
    tiempo_retorno = mat_tiempo[nodo_actual_idx][indice_deposito]
    distancia_acumulada_km += dist_retorno
    regreso_almacen_min = tiempo_actual + tiempo_retorno

    if regreso_almacen_min > hora_fin_jornada_min:
        infracciones.append(f"Exceso de jornada: regreso a las {formatear_minutos_a_hhmm(regreso_almacen_min)} > fin jornada {vehiculo.fin_jornada}")

    duracion_total = regreso_almacen_min - hora_salida_almacen_min

    util_peso = round((peso_total / vehiculo.capacidad_peso_kg) * 100, 1) if vehiculo.capacidad_peso_kg > 0 else 0
    util_vol = round((vol_total / vehiculo.capacidad_volumen_m3) * 100, 1) if vehiculo.capacidad_volumen_m3 > 0 else 0

    return {
        "paradas": paradas,
        "peso_total_kg": round(peso_total, 2),
        "volumen_total_m3": round(vol_total, 2),
        "distancia_total_km": round(distancia_acumulada_km, 2),
        "duracion_total_min": round(duracion_total, 1),
        "salida_almacen": vehiculo.inicio_jornada,
        "regreso_almacen": formatear_minutos_a_hhmm(regreso_almacen_min),
        "utilizacion_peso_pct": util_peso,
        "utilizacion_vol_pct": util_vol,
        "infracciones": infracciones
    }
