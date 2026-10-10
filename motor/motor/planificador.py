import time
from datetime import datetime
from typing import List, Dict, Any
from motor.motor.modelos import InstanciaVRP, SolucionVRP, RutaResultado, NoAsignadoResultado, Punto
from motor.motor.matriz import matriz_distancias_tiempos
from motor.motor.reglas import prefiltrar_pedidos
from motor.motor.hibrido.construccion import construir_solucion_inicial
from motor.motor.hibrido.busqueda_local import optimizar_2opt
from motor.motor.hibrido.evaluacion import evaluar_ruta

def optimizar_vrp(instancia: InstanciaVRP, metodo: str = "HIBRIDO") -> SolucionVRP:
    """
    Punto de entrada principal para la optimización de rutas del SIPRD.
    Ejecuta el pipeline completo: prefiltro, cálculo de matriz, inserción y búsqueda local.
    """
    inicio_t = time.time()

    # 1. Prefiltrar pedidos
    pedidos_aptos, no_asignados_prefiltro = prefiltrar_pedidos(
        instancia.pedidos,
        instancia.vehiculos,
        dia_semana=(datetime.strptime(instancia.fecha,"%d/%m/%Y").weekday()+1)%7
    )

    if not pedidos_aptos or not instancia.vehiculos:
        return SolucionVRP(
            metodo=metodo,
            rutas=[],
            no_asignados=no_asignados_prefiltro,
            total_distancia_km=0.0,
            total_duracion_min=0.0,
            total_pedidos_asignados=0,
            tiempo_ejecucion_seg=round(time.time() - inicio_t, 3),
            infracciones=[]
        )

    # 2. Construir nodos y mapa de índices (depósito = 0)
    todos_puntos: List[Punto] = [instancia.deposito] + pedidos_aptos
    mapa_indices = {p.id: idx for idx, p in enumerate(todos_puntos)}

    # 3. Matriz de distancias y tiempos
    mat_dist, mat_tiempo = matriz_distancias_tiempos(todos_puntos, instancia.velocidad_kmh)

    # 4. Construcción inicial
    rutas_iniciales, no_asignados_capacidad = construir_solucion_inicial(
        instancia.deposito,
        pedidos_aptos,
        instancia.vehiculos,
        mat_dist,
        mat_tiempo,
        mapa_indices
    )

    todos_no_asignados = no_asignados_prefiltro + no_asignados_capacidad

    # 5. Búsqueda local 2-opt para cada ruta
    rutas_optimizadas: List[RutaResultado] = []
    mapa_vehiculos = {v.id: v for v in instancia.vehiculos}

    for r in rutas_iniciales:
        v = mapa_vehiculos.get(r.vehiculo_id)
        if not v or not r.paradas:
            rutas_optimizadas.append(r)
            continue

        pedidos_en_ruta = [
            next(p for p in pedidos_aptos if p.id == parada.pedido_id)
            for parada in r.paradas
        ]

        secuencia_opt = optimizar_2opt(
            instancia.deposito,
            pedidos_en_ruta,
            v,
            mat_dist,
            mat_tiempo,
            mapa_indices
        )

        indices_opt = [mapa_indices[p.id] for p in secuencia_opt]
        eval_opt = evaluar_ruta(
            instancia.deposito,
            secuencia_opt,
            v,
            mat_dist,
            mat_tiempo,
            0,
            indices_opt
        )

        rutas_optimizadas.append(RutaResultado(
            ruta_id=r.ruta_id,
            vehiculo_id=v.id,
            placa=v.placa,
            paradas=eval_opt["paradas"],
            peso_total_kg=eval_opt["peso_total_kg"],
            volumen_total_m3=eval_opt["volumen_total_m3"],
            distancia_total_km=eval_opt["distancia_total_km"],
            duracion_total_min=eval_opt["duracion_total_min"],
            salida_almacen=eval_opt["salida_almacen"],
            regreso_almacen=eval_opt["regreso_almacen"],
            utilizacion_peso_pct=eval_opt["utilizacion_peso_pct"],
            utilizacion_vol_pct=eval_opt["utilizacion_vol_pct"]
        ))

    total_dist = round(sum(r.distancia_total_km for r in rutas_optimizadas), 2)
    total_dur = round(sum(r.duracion_total_min for r in rutas_optimizadas), 1)
    total_asig = sum(len(r.paradas) for r in rutas_optimizadas)
    delta_t = round(time.time() - inicio_t, 3)

    return SolucionVRP(
        metodo=metodo,
        rutas=rutas_optimizadas,
        no_asignados=todos_no_asignados,
        total_distancia_km=total_dist,
        total_duracion_min=total_dur,
        total_pedidos_asignados=total_asig,
        tiempo_ejecucion_seg=delta_t,
        infracciones=[]
    )
