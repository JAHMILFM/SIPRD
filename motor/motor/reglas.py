from typing import List, Tuple, Optional
from motor.motor.modelos import Punto, VehiculoVRP, NoAsignadoResultado

def parse_hhmm_a_minutos(cadena_hora: Optional[str]) -> Optional[int]:
    """Convierte '08:30' a minutos desde las 00:00 (510 min)."""
    if not cadena_hora:
        return None
    try:
        partes = cadena_hora.strip().split(":")
        return int(partes[0]) * 60 + int(partes[1])
    except Exception:
        return None

def formatear_minutos_a_hhmm(minutos: float) -> str:
    """Convierte minutos desde las 00:00 a formato 'HH:MM'."""
    mins = int(round(minutos)) % (24 * 60)
    hh = mins // 60
    mm = mins % 60
    return f"{hh:02d}:{mm:02d}"

def prefiltrar_pedidos(
    pedidos: List[Punto],
    vehiculos: List[VehiculoVRP],
    dia_semana: Optional[int] = None # 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
) -> Tuple[List[Punto], List[NoAsignadoResultado]]:
    """
    Prefiltra pedidos inviables antes del ruteo.
    Devuelve (pedidos_aptos, lista_no_asignados_con_motivo).
    """
    aptos: List[Punto] = []
    no_asignados: List[NoAsignadoResultado] = []

    # Máxima capacidad unitaria de la flota
    max_peso_flota = max([v.capacidad_peso_kg for v in vehiculos], default=0)
    max_vol_flota = max([v.capacidad_volumen_m3 for v in vehiculos], default=0)

    for p in pedidos:
        # 1. Validación de coordenadas válidas de Lima
        if abs(p.lat) < 1.0 or abs(p.lon) < 1.0:
            no_asignados.append(NoAsignadoResultado(
                pedido_id=p.id,
                codigo="COORDENADAS_INVALIDAS",
                motivo="El pedido no cuenta con georreferenciación válida en Lima."
            ))
            continue

        # 2. Validación de día disponible
        if dia_semana is not None and p.dias_permitidos is not None:
            if dia_semana not in p.dias_permitidos:
                dias_nombres = {1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 0: "Domingo"}
                dias_str = ", ".join([dias_nombres.get(d, str(d)) for d in p.dias_permitidos])
                no_asignados.append(NoAsignadoResultado(
                    pedido_id=p.id,
                    codigo="DIA_NO_DISPONIBLE",
                    motivo=f"El cliente no atiende hoy. Días de recepción: {dias_str}."
                ))
                continue

        if p.ventana_inicio and p.ventana_fin and p.ventana_inicio >= p.ventana_fin:
            no_asignados.append(NoAsignadoResultado(pedido_id=p.id,codigo="VENTANA_INCOMPATIBLE",motivo="Las reglas vigentes no tienen un intervalo de recepción común"))
            continue
        # 3. Validación de peso y volumen unitario contra la flota
        if p.peso_kg > max_peso_flota:
            no_asignados.append(NoAsignadoResultado(
                pedido_id=p.id,
                codigo="PESO_EXCEDE_CAPACIDAD_MAXIMA",
                motivo=f"El peso ({p.peso_kg} kg) excede la capacidad del camión más grande ({max_peso_flota} kg)."
            ))
            continue

        if p.volumen_m3 > max_vol_flota:
            no_asignados.append(NoAsignadoResultado(
                pedido_id=p.id,
                codigo="VOLUMEN_EXCEDE_CAPACIDAD_MAXIMA",
                motivo=f"El volumen ({p.volumen_m3} m³) excede la capacidad volumétrica máxima ({max_vol_flota} m³)."
            ))
            continue

        aptos.append(p)

    return aptos, no_asignados
