"""Política de acceso por rol; se consulta en cada petición, no en el JWT."""

CATALOGO = [
    "inicio",
    "algoritmo",
    "rutas",
    "cobranzas",
    "config",
    "registros",
    "reparto",
    "confirmar",
    "vehiculos",
    "restricciones",
    "clientes",
    "pedidos",
    "validar_cobros",
    "cerrar_pedidos",
    "accesos",
    "usuarios",
    "roles",
]
OFICINA = [
    "inicio",
    "algoritmo",
    "rutas",
    "config",
    "vehiculos",
    "restricciones",
    "clientes",
    "pedidos",
    "confirmar",
    "accesos",
]
PREDETERMINADOS = {
    # Cobranzas pertenece a Tesorería. Distribución sólo planifica, confirma
    # rutas y consulta sus resultados; no puede ver ni validar pagos.
    "ASISTENTE_DISTRIBUCION": OFICINA,
    "JEFE_DISTRIBUCION": OFICINA + ["registros"],
    "ASISTENTE": OFICINA,
    "JEFE": OFICINA + ["registros"],
    "TESORERIA": ["cobranzas", "validar_cobros", "cerrar_pedidos", "pedidos"],
    "REPARTIDOR": ["reparto", "cerrar_pedidos"],
    "ADMINISTRADOR": [
        "inicio", "config", "registros", "vehiculos", "restricciones",
        "clientes", "pedidos", "usuarios", "roles",
    ],
}


def permisos_rol(rol):
    return list(
        rol.permisos
        if rol.permisos is not None
        else PREDETERMINADOS.get(rol.nombre, [])
    )


def permiso_peticion(path, method, rol):
    if "/usuarios/roles" in path:
        return "roles"
    if "/usuarios" in path:
        return "usuarios"
    if "/accesos-reparto" in path:
        return "accesos"
    if "/auditoria" in path:
        return "registros"
    if "/restricciones" in path:
        return "restricciones"
    if "/clientes" in path:
        return "restricciones" if path.endswith("/disponibilidad") else "clientes"
    if "/vehiculos" in path:
        return "vehiculos"
    if "/planificaciones" in path:
        if path.endswith("/confirmar"):
            return "confirmar"
        if method == "POST":
            return "algoritmo"
        return ("algoritmo", "rutas")
    if "/incidencias" in path:
        return "rutas"
    if "/reparto" in path:
        return "reparto" if rol == "REPARTIDOR" or method != "GET" else "rutas"
    if "/pedidos" in path:
        if path.endswith("/importaciones"):
            return "algoritmo"
        return "cerrar_pedidos" if path.endswith("/cerrar") else "pedidos"
    if "/cobros" in path:
        if path.endswith("/exportacion.xlsx"):
            return "cobranzas"
        if path.endswith("/contraste"):
            return "validar_cobros"
        if method != "GET":
            return "reparto"
        return "reparto" if rol == "REPARTIDOR" else "cobranzas"
    return None
