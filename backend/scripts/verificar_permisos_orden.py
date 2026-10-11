"""Prueba de integración: permisos vigentes y reordenamiento persistido.
Ejecutar después de verificar_demo_web.py, solo con cuentas y datos de demostración.
"""

import os, uuid
import httpx
from contextlib import contextmanager
from datetime import datetime
from zoneinfo import ZoneInfo

BASE = os.getenv("SIPRD_TEST_API", "http://127.0.0.1:8010/api/v1")
FECHA = os.getenv(
    "DEMO_FECHA", datetime.now(ZoneInfo("America/Lima")).date().isoformat()
)


def call(c, m, p, status=200, **kwargs):
    r = c.request(m, p, **kwargs)
    assert r.status_code == status, (m, p, r.status_code, r.text[:250])
    return r.json() if "json" in r.headers.get("content-type", "") else r


@contextmanager
def login(name):
    c = httpx.Client(base_url=BASE, timeout=180)
    d = call(
        c, "POST", "/auth/login", json={"usuario": name, "clave": "SiprdDemo2026!"}
    )
    c.headers["Authorization"] = "Bearer " + d["access_token"]
    try:
        yield c
    finally:
        c.close()


with login("demo.admin") as admin, login("demo.asistente") as asistente:
    roles = call(admin, "GET", "/usuarios/roles")
    rol = next(r for r in roles if r["nombre"] == "ASISTENTE_DISTRIBUCION")
    original = rol["permisos"]
    try:
        call(
            admin,
            "PUT",
            f"/usuarios/roles/{rol['id']}/permisos",
            json={
                "permisos": [
                    p for p in original if p not in ["algoritmo", "restricciones"]
                ]
            },
        )
        call(
            asistente,
            "POST",
            "/planificaciones/previsualizar",
            403,
            json={"fecha": FECHA, "vehiculo_ids": [16]},
        )
        call(asistente, "GET", "/restricciones", 403)
        call(asistente, "GET", "/usuarios/roles", 403)
        assert "algoritmo" not in call(asistente, "GET", "/auth/yo")["permisos"]
        print("OK: revocación inmediata con la misma sesión y administración exclusiva")
    finally:
        call(
            admin,
            "PUT",
            f"/usuarios/roles/{rol['id']}/permisos",
            json={"permisos": original},
        )
    plans = call(asistente, "GET", f"/planificaciones?fecha={FECHA}")
    active = next(p for p in plans if p["estado"] == "CONFIRMADA")
    plan = call(asistente, "GET", f"/planificaciones/{active['id']}")
    route = next(
        r
        for r in plan["rutas"]
        if all(p["estado"] == "PENDIENTE" for p in r["paradas"])
        and len(r["paradas"]) > 1
    )
    groups = [
        {"id_ruta": r["id"], "parada_ids": [p["id"] for p in r["paradas"]]}
        for r in plan["rutas"]
    ]
    ids = next(g["parada_ids"] for g in groups if g["id_ruta"] == route["id"])
    original_order = list(ids)
    sid = ids[0]
    call(
        asistente,
        "PUT",
        f"/planificaciones/{plan['id']}/paradas/{sid}/bloqueo",
        json={"bloqueada": True},
    )
    ids[0], ids[1] = ids[1], ids[0]
    try:
        call(
            asistente,
            "PUT",
            f"/planificaciones/{plan['id']}/distribucion",
            409,
            json={"rutas": groups},
        )
    finally:
        call(
            asistente,
            "PUT",
            f"/planificaciones/{plan['id']}/paradas/{sid}/bloqueo",
            json={"bloqueada": False},
        )
    print("OK: parada bloqueada rechaza reordenamiento")
    try:
        updated = call(
            asistente,
            "PUT",
            f"/planificaciones/{plan['id']}/distribucion",
            json={"rutas": groups},
        )
        persisted = call(asistente, "GET", f"/planificaciones/{plan['id']}")
        assert (
            next(
                r["paradas"][0]["id"]
                for r in persisted["rutas"]
                if r["id"] == route["id"]
            )
            == ids[0]
        )
        assert all(r["duracion_min"] <= 480 for r in updated["rutas"])
        print("OK: orden manual guardado, consultable y jornada respetada")
    finally:
        ids[:] = original_order
        call(
            asistente,
            "PUT",
            f"/planificaciones/{plan['id']}/distribucion",
            json={"rutas": groups},
        )
    identity = uuid.uuid4().hex[:10]
    form = {
        "nombres": "Prueba",
        "apellidos": "Permisos",
        "correo": f"prueba.{identity}@example.com",
        "nombre_usuario": f"test.{identity}",
        "clave": "SiprdDemo2026!",
        "rol": "ASISTENTE_DISTRIBUCION",
    }
    created = call(admin, "POST", "/usuarios", 201, json=form)
    uid = created["id"]
    form["nombres"] = "Prueba actualizada"
    call(admin, "PUT", f"/usuarios/{uid}", json=form)
    assert (
        next(u for u in call(admin, "GET", "/usuarios") if u["id"] == uid)["nombres"]
        == form["nombres"]
    )
    call(admin, "POST", f"/usuarios/{uid}/desactivar")
    call(
        admin,
        "POST",
        "/auth/login",
        401,
        json={"usuario": form["nombre_usuario"], "clave": form["clave"]},
    )
    print("OK: registro, consulta, actualización y desactivación de usuario")
    print("VERIFICACIÓN COMPLETA: permisos y orden")
