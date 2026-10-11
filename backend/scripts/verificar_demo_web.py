"""Verificación integrada de RF contra la API y datos sintéticos de Neon.
Usa pedidos DEMO_ZONAS; comprueba seis rutas y completa un pedido sintético.
"""

import os, json, base64
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import httpx
from contextlib import contextmanager

FECHA = os.getenv(
    "DEMO_FECHA", datetime.now(ZoneInfo("America/Lima")).date().isoformat()
)
BASE = os.getenv("SIPRD_TEST_API", "http://127.0.0.1:8010/api/v1")
resultados = []


def check(nombre, ok):
    if not ok:
        raise AssertionError(nombre)
    resultados.append(nombre)
    print("OK:", nombre)


def call(c, method, path, expected=200, **kw):
    r = c.request(method, path, **kw)
    if r.status_code != expected:
        raise AssertionError(
            f"{method} {path}: esperado {expected}, recibido {r.status_code}: {r.text[:400]}"
        )
    return r


@contextmanager
def login(nombre, clave="SiprdDemo2026!"):
    c = httpx.Client(base_url=BASE, timeout=180)
    r = call(c, "POST", "/auth/login", json={"usuario": nombre, "clave": clave})
    c.headers["Authorization"] = "Bearer " + r.json()["access_token"]
    try:
        yield c
    finally:
        c.close()


with (
    login("demo.asistente") as asistente,
    login("demo.tesoreria") as tesoreria,
    login("demo.admin") as admin,
):
    vs = call(asistente, "GET", "/vehiculos").json()
    ids = [v["id"] for v in vs if v["codigo_externo"].startswith("DEMO6-")]
    check("Maestro de seis vehículos en PostgreSQL", len(ids) == 6)
    plans = call(asistente, "GET", f"/planificaciones?fecha={FECHA}").json()
    plan = None
    for p in plans:
        d = call(asistente, "GET", f"/planificaciones/{p['id']}").json()
        if len(d["rutas"]) == 6 and all(r["vehiculo"]["id"] in ids for r in d["rutas"]):
            plan = d
            break
    if not plan:
        plan = call(
            asistente,
            "POST",
            "/planificaciones",
            201,
            json={
                "fecha": FECHA,
                "vehiculo_ids": ids,
                "parametros": {"inicio_jornada": "07:30", "jornada_horas": 8},
            },
        ).json()
    check(
        "Pedidos pendientes distribuidos en seis rutas persistidas",
        sum(len(r["paradas"]) for r in plan["rutas"]) == plan["resultado"]["total_pedidos_asignados"],
    )
    check(
        "Norte y sur usan dos vehículos; este y centro uno",
        sorted(r["zona"] for r in plan["rutas"])
        == ["CENTRO", "ESTE", "NORTE", "NORTE", "SUR", "SUR"],
    )
    check(
        "Se respeta jornada de ocho horas con regreso y capacidades",
        all(
            r["duracion_min"] <= 480
            and r["peso_kg"] <= r["vehiculo"]["capacidad_kg"]
            and r["volumen_m3"] <= r["vehiculo"]["capacidad_m3"]
            for r in plan["rutas"]
        ),
    )
    if plan["estado"] != "CONFIRMADA":
        s = plan["rutas"][0]["paradas"][0]
        call(
            asistente,
            "PUT",
            f"/planificaciones/{plan['id']}/paradas/{s['id']}/bloqueo",
            json={"bloqueada": True},
        )
        grupos = [
            {"id_ruta": r["id"], "parada_ids": [s["id"] for s in r["paradas"]]}
            for r in plan["rutas"]
        ]
        grupos[0]["parada_ids"][0], grupos[0]["parada_ids"][1] = (
            grupos[0]["parada_ids"][1],
            grupos[0]["parada_ids"][0],
        )
        call(
            asistente,
            "PUT",
            f"/planificaciones/{plan['id']}/distribucion",
            409,
            json={"rutas": grupos},
        )
        check("Paradas fijadas no se pueden reordenar", True)
        call(
            asistente,
            "PUT",
            f"/planificaciones/{plan['id']}/paradas/{s['id']}/bloqueo",
            json={"bloqueada": False},
        )
        plan = call(
            asistente, "POST", f"/planificaciones/{plan['id']}/confirmar"
        ).json()
    check("Asistente puede confirmar y publicar rutas", plan["estado"] == "CONFIRMADA")
    accesos = call(asistente, "GET", f"/accesos-reparto?fecha={FECHA}").json()
    u = next(u for u in accesos if u["placa"] == "FIC-001")
    clave = call(asistente, "GET", f"/accesos-reparto/{u['id']}/clave").json()["clave"]
    call(tesoreria, "GET", f"/accesos-reparto/{u['id']}/clave", 403)
    with login(u["placa"], clave) as reparto:
        rutas = call(reparto, "GET", "/reparto/mis-rutas").json()
        ruta_actual = next(x for x in plan["rutas"] if x["vehiculo"]["placa"] == "FIC-001")
        r = next(x for x in rutas if x["ruta_id"] == ruta_actual["id"])
        check(
            "Login por placa y alcance de su vehículo",
            all(x["vehiculo"] == u["placa"] for x in rutas),
        )
        otra = next(x for x in plan["rutas"] if x["vehiculo"]["placa"] != "FIC-001")
        call(reparto, "GET", f"/reparto/ruta/{otra['id']}", 403)
        call(
            reparto,
            "POST",
            "/cobros",
            403,
            json={
                "parada_id": otra["paradas"][0]["id"],
                "monto": 10,
                "medio_pago": "EFECTIVO",
            },
        )
        call(reparto, "POST", f"/pedidos/{otra['paradas'][0]['pedido_id']}/cerrar", 403)
        call(reparto, "GET", "/vehiculos", 403)
        check("Repartidor no consulta ni modifica otro vehículo", True)
        s = next(
            (x for x in r["paradas"] if not x["cierre_financiero"]), r["paradas"][0]
        )
        pid = s["pedido_id"]
        sid = s["id"]
        monto = s["importe"]
        if s["cierre_financiero"] is None:
            call(reparto, "POST", f"/pedidos/{pid}/cerrar", 409)
            png = base64.b64decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0RkAAAAASUVORK5CYII="
            )
            call(
                reparto,
                "POST",
                f"/reparto/paradas/{sid}/evidencias",
                201,
                files={"archivo": ("entrega-demo.png", png, "image/png")},
            )
            call(reparto, "POST", f"/pedidos/{pid}/cerrar", 409)
            check("Evidencia de entrega no cierra el pedido sin cobro validado", True)
            # Reutiliza el cobro de la prueba en ejecuciones repetidas.
            cobros = call(reparto, "GET", f"/cobros?fecha={FECHA}").json()
            exist = next((c for c in cobros if c["parada_id"] == sid), None)
            if exist:
                cid = exist["id"]
            else:
                cid = call(
                    reparto,
                    "POST",
                    "/cobros",
                    201,
                    json={
                        "parada_id": sid,
                        "monto": monto - 1,
                        "medio_pago": "TRANSFERENCIA",
                        "numero_operacion": "DEMO-TEST-001",
                    },
                ).json()["cobro_id"]
            call(
                tesoreria,
                "POST",
                f"/cobros/{cid}/contraste",
                409,
                json={"resultado": "CONFORME"},
            )
            call(
                reparto,
                "POST",
                f"/cobros/{cid}/comprobante",
                files={"archivo": ("comprobante-demo.png", png, "image/png")},
            )
            call(
                tesoreria,
                "POST",
                f"/cobros/{cid}/contraste",
                json={
                    "resultado": "OBSERVADO",
                    "observacion": "Prueba: corregir el importe digitado",
                },
            )
            call(reparto, "POST", f"/pedidos/{pid}/cerrar", 409)
            check("Observación de Tesorería mantiene el cierre bloqueado", True)
            call(
                reparto,
                "PUT",
                f"/cobros/{cid}",
                json={
                    "monto": monto - 1,
                    "medio_pago": "TRANSFERENCIA",
                    "numero_operacion": "DEMO-TEST-001",
                },
            )
            call(
                tesoreria,
                "POST",
                f"/cobros/{cid}/contraste",
                json={"resultado": "CONFORME"},
            )
            call(reparto, "POST", f"/pedidos/{pid}/cerrar", 409)
            check("Pago parcial confirmado mantiene el cierre bloqueado", True)
            call(
                tesoreria,
                "POST",
                f"/cobros/{cid}/contraste",
                json={
                    "resultado": "OBSERVADO",
                    "observacion": "Prueba: falta un sol para completar el importe",
                },
            )
            call(
                reparto,
                "PUT",
                f"/cobros/{cid}",
                json={
                    "monto": monto,
                    "medio_pago": "TRANSFERENCIA",
                    "numero_operacion": "DEMO-TEST-001",
                },
            )
            call(
                reparto,
                "POST",
                f"/cobros/{cid}/contraste",
                403,
                json={"resultado": "CONFORME"},
            )
            call(
                tesoreria,
                "POST",
                f"/cobros/{cid}/contraste",
                json={"resultado": "CONFORME"},
            )
            call(reparto, "POST", f"/pedidos/{pid}/cerrar")
            check(
                "Corrección vuelve a pendiente y permite cierre al 100% validado", True
            )
            call(
                reparto,
                "PUT",
                f"/cobros/{cid}",
                409,
                json={"monto": monto, "medio_pago": "EFECTIVO"},
            )
            check("Cobro confirmado y pedido cerrado no admiten cambios", True)
        sh = call(tesoreria, "GET", f"/cobros/exportacion.xlsx?fecha={FECHA}")
        check(
            "Exportación del arqueo a Excel con datos registrados",
            sh.content[:2] == b"PK",
        )
        call(reparto, "GET", f"/cobros/exportacion.xlsx?fecha={FECHA}", 403)
        call(asistente, "POST", f"/accesos-reparto/{u['id']}/regenerar")
        call(reparto, "GET", "/reparto/mis-rutas", 401)
        check("Renovar clave diaria revoca sesiones previas", True)
    # CRUD de restricciones sobre un cliente sintético libre, conservando su horario original.
    clientes = call(asistente, "GET", "/clientes?q=Cliente ficticio ESTE 12").json()
    cl = clientes[0]["id"]
    d = call(
        asistente,
        "POST",
        f"/clientes/{cl}/restricciones",
        201,
        json={
            "tipo_restriccion": "NO_RECIBE",
            "fecha_especifica": "2099-01-01",
            "observacion": "Verificación RF",
        },
    ).json()
    call(
        asistente,
        "PUT",
        f"/restricciones/{d['id_restriccion']}",
        json={
            "tipo_restriccion": "NO_RECIBE",
            "fecha_especifica": "2099-01-02",
            "observacion": "Verificación RF actualizada",
        },
    )
    call(asistente, "POST", f"/restricciones/{d['id_restriccion']}/desactivar")
    check("Registrar, consultar, actualizar y desactivar restricciones", True)
    call(admin, "GET", "/usuarios/roles")
    call(admin, "GET", "/auditoria")
    check("Roles de oficina y auditoría consultables por administrador", True)
    reporte = {
        "fecha": FECHA,
        "plan_id": plan["id"],
        "casos_aprobados": resultados,
        "rutas": [
            {
                "placa": r["vehiculo"]["placa"],
                "zona": r["zona"],
                "pedidos": len(r["paradas"]),
                "duracion_min": r["duracion_min"],
                "peso_kg": r["peso_kg"],
                "volumen_m3": r["volumen_m3"],
            }
            for r in plan["rutas"]
        ],
    }
    Path("backend/verificacion_demo.json").write_text(
        json.dumps(reporte, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        "VERIFICACIÓN COMPLETA:", len(resultados), "comprobaciones. Plan:", plan["id"]
    )
