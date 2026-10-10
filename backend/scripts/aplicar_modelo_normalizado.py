"""Migra una rama Neon aislada al modelo SIPRD de 13 tablas.

El script conserva en memoria los datos compatibles del modelo anterior,
recrea el esquema ``siprd`` y los carga en el modelo normalizado.
"""
from __future__ import annotations

import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_SQL = ROOT / "backend" / "app" / "schema_siprd_grupo.sql"


def rows(cur, sql: str) -> list[dict]:
    cur.execute(sql)
    return list(cur.fetchall())


def validate(url: str) -> None:
    host = urlsplit(url.replace("postgresql+psycopg://", "postgresql://")).hostname or ""
    if "-pooler" in host:
        raise SystemExit("Use una conexión directa de Neon, no la URL pooled (-pooler).")
    if os.getenv("SIPRD_CONFIRMAR_RECREACION") != "SI":
        raise SystemExit("Operación protegida. Establezca SIPRD_CONFIRMAR_RECREACION=SI.")
    if os.getenv("SIPRD_RAMA_OBJETIVO") != "siprd-normalizado":
        raise SystemExit("Esta migración solo está autorizada para SIPRD_RAMA_OBJETIVO=siprd-normalizado.")


def snapshot(cur) -> dict[str, list[dict]]:
    """Lectura del modelo anterior antes de recrear el esquema."""
    return {
        "roles": rows(cur, "SELECT id_rol,nombre,descripcion FROM siprd.roles ORDER BY id_rol"),
        "usuarios": rows(cur, "SELECT id_usuario,id_rol,nombres,apellidos,correo,password_hash,activo,fecha_creacion FROM siprd.usuarios ORDER BY id_usuario"),
        "clientes": rows(cur, "SELECT id_cliente,codigo_externo,razon_social,direccion,distrito,provincia,latitud,longitud,activo,fecha_creacion FROM siprd.clientes ORDER BY id_cliente"),
        "vehiculos": rows(cur, "SELECT id_vehiculo,codigo_externo,placa,marca,modelo,capacidad_kg,capacidad_m3,estado,activo FROM siprd.vehiculos ORDER BY id_vehiculo"),
        "pedidos": rows(cur, "SELECT id_pedido,codigo_externo,id_cliente,fecha_pedido,fecha_programada,peso_kg,volumen_m3,importe,estado,habilitado_despacho,origen,fecha_creacion FROM siprd.pedidos ORDER BY id_pedido"),
        "restricciones": rows(cur, "SELECT id_regla,id_cliente,tipo_regla,dia_semana,hora_inicio,hora_fin,observacion,activa,fecha_creacion,fecha_actualizacion FROM siprd.reglas_cliente ORDER BY id_regla"),
        "rutas": rows(cur, "SELECT id_ruta,id_vehiculo,fecha_ruta,estado,distancia_total_km,tiempo_estimado_min,id_usuario_aprobador,fecha_aprobacion,fecha_creacion FROM siprd.rutas ORDER BY id_ruta"),
        "paradas": rows(cur, "SELECT id_parada,id_ruta,id_pedido,secuencia,eta_estimada,hora_llegada_real,distancia_anterior_km,tiempo_servicio_min,bloqueada_manual,estado,fecha_creacion FROM siprd.paradas_ruta ORDER BY id_parada"),
        "cobranzas": rows(cur, "SELECT id_cobranza,id_parada,monto_cobrado,medio_pago,estado,numero_operacion,observacion,id_usuario_validador,fecha_cobro,fecha_validacion FROM siprd.cobranzas ORDER BY id_cobranza"),
        "evidencias": rows(cur, "SELECT id_evidencia,id_parada,url_archivo,nombre_archivo,tipo_mime,descripcion,id_usuario_registro,fecha_registro FROM siprd.evidencias_entrega ORDER BY id_evidencia"),
        "incidencias": rows(cur, "SELECT id_incidencia,id_parada,tipo,descripcion,estado,fecha_hora FROM siprd.incidencias ORDER BY id_incidencia"),
        "auditoria": rows(cur, "SELECT id_auditoria,id_usuario,entidad,id_entidad,accion,valor_anterior,valor_nuevo,fecha_hora FROM siprd.auditoria ORDER BY id_auditoria"),
    }


def insert(cur, table: str, columns: list[str], values: list[tuple]) -> None:
    if not values:
        return
    fields = ", ".join(columns)
    params = ", ".join(["%s"] * len(columns))
    cur.executemany(
        f"INSERT INTO siprd.{table} ({fields}) OVERRIDING SYSTEM VALUE VALUES ({params})", values
    )


def migrate(cur, data: dict[str, list[dict]]) -> None:
    if not data["usuarios"]:
        raise SystemExit("No hay usuarios de origen para preservar la trazabilidad.")
    default_user = data["usuarios"][0]["id_usuario"]

    insert(cur, "roles", ["id_rol", "nombre", "descripcion", "activo"], [(r["id_rol"], r["nombre"], r["descripcion"], True) for r in data["roles"]])
    existing_roles = {r["nombre"] for r in data["roles"]}
    for name, description in (("REPARTIDOR", "Registra entregas, evidencias y cobros."), ("TESORERIA", "Valida cobros y realiza arqueos.")):
        if name not in existing_roles:
            cur.execute("INSERT INTO siprd.roles (id_rol, nombre, descripcion) SELECT COALESCE(MAX(id_rol), 0) + 1, %s, %s FROM siprd.roles", (name, description))

    insert(cur, "usuarios", ["id_usuario", "id_rol", "nombres", "apellidos", "correo", "password_hash", "activo", "fecha_creacion"], [tuple(r[c] for c in ("id_usuario", "id_rol", "nombres", "apellidos", "correo", "password_hash", "activo", "fecha_creacion")) for r in data["usuarios"]])
    insert(cur, "clientes", ["id_cliente", "codigo_externo", "razon_social", "direccion", "distrito", "provincia", "latitud", "longitud", "activo", "fecha_creacion"], [tuple(r[c] for c in ("id_cliente", "codigo_externo", "razon_social", "direccion", "distrito", "provincia", "latitud", "longitud", "activo", "fecha_creacion")) for r in data["clientes"]])
    insert(cur, "vehiculos", ["id_vehiculo", "codigo_externo", "placa", "marca", "modelo", "capacidad_kg", "capacidad_m3", "estado_operativo", "activo"], [(r["id_vehiculo"], r["codigo_externo"], r["placa"], r["marca"], r["modelo"], r["capacidad_kg"], r["capacidad_m3"], r["estado"], r["activo"]) for r in data["vehiculos"]])
    insert(cur, "pedidos", ["id_pedido", "codigo_externo", "id_cliente", "fecha_pedido", "fecha_programada", "peso_kg", "volumen_m3", "importe_total", "estado", "habilitado_despacho", "origen", "fecha_creacion"], [(r["id_pedido"], r["codigo_externo"], r["id_cliente"], r["fecha_pedido"], r["fecha_programada"], r["peso_kg"], r["volumen_m3"], r["importe"], r["estado"], r["habilitado_despacho"], r["origen"], r["fecha_creacion"]) for r in data["pedidos"]])
    insert(cur, "restricciones_cliente", ["id_restriccion", "id_cliente", "tipo_restriccion", "dia_semana", "fecha_especifica", "hora_inicio", "hora_fin", "observacion", "activo", "fecha_creacion", "fecha_actualizacion"], [(r["id_regla"], r["id_cliente"], "VENTANA_HORARIA" if r["tipo_regla"] == "VENTANA_HORARIA" else "NO_RECIBE", r["dia_semana"], None, r["hora_inicio"], r["hora_fin"], r["observacion"], r["activa"], r["fecha_creacion"], r["fecha_actualizacion"]) for r in data["restricciones"]])

    # El origen no tenía cabecera de planificación. Se genera una por fecha de ruta.
    routes_by_date: dict[object, list[dict]] = defaultdict(list)
    for route in data["rutas"]:
        routes_by_date[route["fecha_ruta"]].append(route)
    plan_by_date: dict[object, int] = {}
    for fecha, same_day_routes in sorted(routes_by_date.items()):
        approver = next((r["id_usuario_aprobador"] for r in same_day_routes if r["id_usuario_aprobador"]), default_user)
        confirmed_at = next((r["fecha_aprobacion"] for r in same_day_routes if r["fecha_aprobacion"]), datetime.now(timezone.utc))
        cur.execute("INSERT INTO siprd.planificaciones (fecha_operacion,numero_version,algoritmo,estado,id_usuario_creador,id_usuario_confirmador,fecha_confirmacion) VALUES (%s,1,'GENETICO','CONFIRMADA',%s,%s,%s) RETURNING id_planificacion", (fecha, default_user, approver, confirmed_at))
        plan_by_date[fecha] = cur.fetchone()["id_planificacion"]
    insert(cur, "rutas", ["id_ruta", "id_planificacion", "id_vehiculo", "estado", "distancia_total_km", "tiempo_estimado_min", "fecha_creacion"], [(r["id_ruta"], plan_by_date[r["fecha_ruta"]], r["id_vehiculo"], r["estado"], r["distancia_total_km"], r["tiempo_estimado_min"], r["fecha_creacion"]) for r in data["rutas"]])
    insert(cur, "paradas_ruta", ["id_parada", "id_ruta", "id_pedido", "secuencia", "eta_estimada", "hora_llegada_real", "distancia_anterior_km", "tiempo_servicio_min", "bloqueada_manual", "estado", "fecha_creacion"], [tuple(r[c] for c in ("id_parada", "id_ruta", "id_pedido", "secuencia", "eta_estimada", "hora_llegada_real", "distancia_anterior_km", "tiempo_servicio_min", "bloqueada_manual", "estado", "fecha_creacion")) for r in data["paradas"]])

    states = {"VALIDADO": "CONFORME", "RECHAZADO": "OBSERVADO", "PENDIENTE": "PENDIENTE"}
    allowed_methods = {"EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA", "DEPOSITO", "CHEQUE"}
    insert(cur, "cobros", ["id_cobro", "id_parada", "medio_pago", "monto", "numero_operacion", "estado", "observacion", "id_usuario_registro", "id_usuario_validador", "fecha_registro", "fecha_validacion"], [(r["id_cobranza"], r["id_parada"], r["medio_pago"] if r["medio_pago"] in allowed_methods else "TRANSFERENCIA", r["monto_cobrado"], r["numero_operacion"], states.get(r["estado"], "OBSERVADO"), r["observacion"] if states.get(r["estado"], "OBSERVADO") != "OBSERVADO" or r["observacion"] else "Migrado: requiere revisión", r["id_usuario_validador"] or default_user, r["id_usuario_validador"] if states.get(r["estado"], "OBSERVADO") != "PENDIENTE" else None, r["fecha_cobro"], r["fecha_validacion"] if states.get(r["estado"], "OBSERVADO") != "PENDIENTE" else None) for r in data["cobranzas"]])
    insert(cur, "evidencias_entrega", ["id_evidencia", "id_parada", "url_archivo", "nombre_archivo", "tipo_mime", "descripcion", "id_usuario_registro", "fecha_registro"], [tuple(r[c] for c in ("id_evidencia", "id_parada", "url_archivo", "nombre_archivo", "tipo_mime", "descripcion", "id_usuario_registro", "fecha_registro")) for r in data["evidencias"]])
    insert(cur, "incidencias", ["id_incidencia", "id_parada", "tipo", "descripcion", "estado", "id_usuario_registro", "fecha_hora"], [(r["id_incidencia"], r["id_parada"], r["tipo"], r["descripcion"], r["estado"], default_user, r["fecha_hora"]) for r in data["incidencias"]])
    action_map = {"ELIMINAR": "DESACTIVAR", "APROBAR": "CONFIRMAR", "PUBLICAR": "CONFIRMAR", "REOPTIMIZAR": "REPLANIFICAR"}
    insert(cur, "auditoria", ["id_auditoria", "id_usuario", "entidad", "id_entidad", "accion", "valor_anterior", "valor_nuevo", "fecha_hora"], [(r["id_auditoria"], r["id_usuario"], r["entidad"], r["id_entidad"], action_map.get(r["accion"], r["accion"]), Jsonb(r["valor_anterior"]) if r["valor_anterior"] is not None else None, Jsonb(r["valor_nuevo"]) if r["valor_nuevo"] is not None else None, r["fecha_hora"]) for r in data["auditoria"]])

    for table, column in (("roles", "id_rol"), ("usuarios", "id_usuario"), ("clientes", "id_cliente"), ("vehiculos", "id_vehiculo"), ("pedidos", "id_pedido"), ("restricciones_cliente", "id_restriccion"), ("planificaciones", "id_planificacion"), ("rutas", "id_ruta"), ("paradas_ruta", "id_parada"), ("cobros", "id_cobro"), ("evidencias_entrega", "id_evidencia"), ("incidencias", "id_incidencia"), ("auditoria", "id_auditoria")):
        cur.execute(f"SELECT setval(pg_get_serial_sequence('siprd.{table}', '{column}'), COALESCE((SELECT MAX({column}) FROM siprd.{table}), 1), true)")


def main() -> None:
    url = os.getenv("DATABASE_URL_DIRECT")
    if not url:
        raise SystemExit("Falta DATABASE_URL_DIRECT (use la conexión directa de Neon).")
    validate(url)
    with psycopg.connect(url, autocommit=False, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            data = snapshot(cur)
            cur.execute("DROP SCHEMA IF EXISTS siprd CASCADE")
            cur.execute(SCHEMA_SQL.read_text(encoding="utf-8"))
            migrate(cur, data)
        conn.commit()
    print("Migración completada: 13 tablas normalizadas y datos conservados.")


if __name__ == "__main__":
    main()
