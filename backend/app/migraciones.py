from sqlalchemy import text, inspect
from backend.app.models import SCHEMA

CAMBIOS_V1 = {
    "auditoria": ["referencia_entidad VARCHAR(80)"],
    "usuarios": ["nombre_usuario VARCHAR(80)", "documento VARCHAR(30)", "fecha_ultimo_acceso TIMESTAMP WITH TIME ZONE"],
    "incidencias": ["registrada_por BIGINT REFERENCES siprd.usuarios(id_usuario)", "atendida_por BIGINT REFERENCES siprd.usuarios(id_usuario)", "resolucion VARCHAR(1000)"],
    "vehiculos": ["conductor_nombre VARCHAR(150)"],
    "rutas": ["id_repartidor BIGINT REFERENCES siprd.usuarios(id_usuario)"],
    "cobros": ["numero_operacion VARCHAR(100)"],
    "observaciones_cobro": ["resuelta BOOLEAN NOT NULL DEFAULT FALSE"],
    "accesos_comprobante": ["accion VARCHAR(30) NOT NULL DEFAULT 'VER'"],
    "comprobantes_pago": ["version INTEGER NOT NULL DEFAULT 1", "vigente BOOLEAN NOT NULL DEFAULT TRUE", "subido_por BIGINT REFERENCES siprd.usuarios(id_usuario)"],
}

async def migrar(conn):
    if conn.dialect.name == "sqlite":
        for table, definitions in CAMBIOS_V1.items():
            columns = await conn.run_sync(lambda c: {col['name'] for col in inspect(c).get_columns(table)})
            for definition in definitions:
                if definition.split()[0] not in columns:
                    definition = definition.replace('REFERENCES siprd.', 'REFERENCES ')
                    await conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {definition}'))
    elif conn.dialect.name != "postgresql":
        raise RuntimeError('Motor de base de datos no compatible')
    if conn.dialect.name == "postgresql":
        await conn.execute(text("SELECT pg_advisory_xact_lock(20261010)"))
    for table, columns in (CAMBIOS_V1.items() if conn.dialect.name == "postgresql" else []):
        for definition in columns:
            await conn.execute(text(f"ALTER TABLE {SCHEMA}.{table} ADD COLUMN IF NOT EXISTS {definition}"))

    usuarios = f"{SCHEMA}.usuarios" if SCHEMA else "usuarios"
    await conn.execute(text(f"UPDATE {usuarios} SET nombre_usuario = lower(substr(correo, 1, instr(correo, '@') - 1)) WHERE nombre_usuario IS NULL") if conn.dialect.name == "sqlite" else text(f"UPDATE {usuarios} SET nombre_usuario = lower(split_part(correo, '@', 1)) WHERE nombre_usuario IS NULL"))
    await conn.execute(text(f"CREATE UNIQUE INDEX IF NOT EXISTS ux_siprd_nombre_usuario ON {usuarios} (nombre_usuario)"))
