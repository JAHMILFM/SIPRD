import asyncio
from datetime import datetime, date, time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from backend.app.core.db import AsyncSessionLocal, engine, Base
from backend.app.core.config import settings
from backend.app.core.seguridad import hash_contrasena
from backend.app.models import (
    Rol, Usuario, Vehiculo, Cliente, Pedido, ReglaCliente,
    Ruta, ParadaRuta, Auditoria, SCHEMA
)

ROLES_DEMO = [
    {"id_rol": 1, "nombre": "JEFE", "descripcion": "Jefe de Distribución — Aprobador"},
    {"id_rol": 2, "nombre": "ASISTENTE", "descripcion": "Asistente de Distribución — Planificador"},
    {"id_rol": 3, "nombre": "ADMINISTRADOR", "descripcion": "Administrador de Tecnologías de Información"},
    {"id_rol": 4, "nombre": "REPARTIDOR", "descripcion": "Conductor y Repartidor de Flota"},
    {"id_rol": 5, "nombre": "TESORERIA", "descripcion": "Finanzas y Liquidación de Cobros"}
]

USUARIOS_DEMO = [
    {
        "id_usuario": 1,
        "id_rol": 1,
        "nombres": "Dennys",
        "apellidos": "Huerta",
        "correo": "dhuerta@alfadistribuidores.com",
        "clave": "jefe123"
    },
    {
        "id_usuario": 2,
        "id_rol": 2,
        "nombres": "Lesli",
        "apellidos": "Pomalaya",
        "correo": "lpomalaya@alfadistribuidores.com",
        "clave": "dist123"
    },
    {
        "id_usuario": 3,
        "id_rol": 3,
        "nombres": "Administrador",
        "apellidos": "TI",
        "correo": "admin.ti@alfadistribuidores.com",
        "clave": "ti2026"
    },
    {
        "id_usuario": 4,
        "id_rol": 4,
        "nombres": "Elías",
        "apellidos": "López",
        "correo": "elopez@alfadistribuidores.com",
        "clave": "rep123"
    },
    {
        "id_usuario": 5,
        "id_rol": 5,
        "nombres": "Mariana",
        "apellidos": "Vásquez",
        "correo": "tesoreria@alfadistribuidores.com",
        "clave": "teso123"
    }
]

VEHICULOS_DEMO = [
    {"id_vehiculo": 1, "codigo_externo": "VEH-001", "placa": "BCE-869", "marca": "Hyundai", "modelo": "HD78", "capacidad_kg": 12000, "capacidad_m3": 32, "estado": "ASIGNADO"},
    {"id_vehiculo": 2, "codigo_externo": "VEH-002", "placa": "DB8-877", "marca": "Toyota", "modelo": "Dyna", "capacidad_kg": 12000, "capacidad_m3": 32, "estado": "ASIGNADO"},
    {"id_vehiculo": 3, "codigo_externo": "VEH-003", "placa": "AFG-747", "marca": "Suzuki", "modelo": "Super Carry", "capacidad_kg": 8000, "capacidad_m3": 21, "estado": "ASIGNADO"},
    {"id_vehiculo": 4, "codigo_externo": "VEH-004", "placa": "BHL-751", "marca": "Kia", "modelo": "Bongo", "capacidad_kg": 8000, "capacidad_m3": 21, "estado": "ASIGNADO"},
    {"id_vehiculo": 5, "codigo_externo": "VEH-005", "placa": "XXX-000", "marca": "Isuzu", "modelo": "N-Series", "capacidad_kg": 8000, "capacidad_m3": 21, "estado": "ASIGNADO"},
    {"id_vehiculo": 6, "codigo_externo": "VEH-006", "placa": "BUE-734", "marca": "Hino", "modelo": "300", "capacidad_kg": 8000, "capacidad_m3": 21, "estado": "MANTENIMIENTO"},
    {"id_vehiculo": 7, "codigo_externo": "VEH-007", "placa": "AFG-748", "marca": "Foton", "modelo": "Aumark", "capacidad_kg": 6000, "capacidad_m3": 16, "estado": "INACTIVO"}
]

CLIENTES_DEMO = [
    {"id_cliente": 1, "codigo_externo": "CLI-9301982", "razon_social": "QUIÑONES VALENZUELA, VIRGINIA", "direccion": "Jr. Madre Selva 592, Urb. Santa Isabel", "distrito": "Carabayllo", "latitud": -11.8700, "longitud": -77.0300},
    {"id_cliente": 2, "codigo_externo": "CLI-9300963", "razon_social": "FARMA IMPERIO S.A.C.", "direccion": "Av. Los Jardines Este Mz B Lote 4", "distrito": "San Juan de Lurigancho", "latitud": -12.0100, "longitud": -77.0000},
    {"id_cliente": 3, "codigo_externo": "CLI-9300778", "razon_social": "RODRIGUEZ BERNAL RAMOS S.A.C.", "direccion": "Av. Sáenz Peña 1120", "distrito": "Callao", "latitud": -12.0600, "longitud": -77.1400},
    {"id_cliente": 4, "codigo_externo": "CLI-9300891", "razon_social": "GRUPO FAMEZA S.A.C.", "direccion": "Z.I. Parque Industrial del Cono Sur", "distrito": "Villa El Salvador", "latitud": -12.2100, "longitud": -76.9400},
    {"id_cliente": 5, "codigo_externo": "CLI-3881628", "razon_social": "GRUPO LIVES S.A.", "direccion": "Lote 2D 7E, Fundo Larrea Sub Lote A", "distrito": "Lurín", "latitud": -12.2600, "longitud": -76.8800},
    {"id_cliente": 6, "codigo_externo": "CLI-9303910", "razon_social": "BOTICAS INKAFARMA — Los Olivos", "direccion": "Av. Alfredo Mendiola 3550", "distrito": "Los Olivos", "latitud": -11.9800, "longitud": -77.0700},
    {"id_cliente": 7, "codigo_externo": "CLI-9301880", "razon_social": "BOTICAS BIOFARMAS SALUD Y VIDA S.A.C.", "direccion": "Av. Próceres de la Independencia 1820", "distrito": "San Juan de Lurigancho", "latitud": -11.9900, "longitud": -76.9900},
    {"id_cliente": 8, "codigo_externo": "CLI-9303120", "razon_social": "FERRETERÍA SAN FELIPE S.A.C.", "direccion": "Av. Grau 902", "distrito": "Ate", "latitud": -12.0300, "longitud": -76.9200},
    {"id_cliente": 9, "codigo_externo": "CLI-9303380", "razon_social": "DISTRIB. LUZ Y COLOR S.A.C.", "direccion": "Av. El Sol 1120", "distrito": "Villa El Salvador", "latitud": -12.2150, "longitud": -76.9420},
    {"id_cliente": 10, "codigo_externo": "CLI-9400137", "razon_social": "COMERCIAL LOS ANDES E.I.R.L.", "direccion": "Mz. J Lote 8", "distrito": "San Martín de Porres", "latitud": -12.0000, "longitud": -77.0800},
    {"id_cliente": 11, "codigo_externo": "CLI-9400248", "razon_social": "ABARROTES EL SOL S.A.C.", "direccion": "Av. Arequipa 1890", "distrito": "Lince", "latitud": -12.0830, "longitud": -77.0330},
    {"id_cliente": 12, "codigo_externo": "CLI-9400285", "razon_social": "MINIMARKET PROGRESO", "direccion": "Jr. Sáenz Peña 610", "distrito": "Callao", "latitud": -12.0570, "longitud": -77.1350}
]

REGLAS_DEMO = [
    {"id_regla": 1, "id_cliente": 1, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(9, 0), "hora_fin": time(13, 0), "es_restriccion_dura": True, "activa": True},
    {"id_regla": 2, "id_cliente": 2, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(8, 0), "hora_fin": time(11, 0), "es_restriccion_dura": True, "activa": True},
    {"id_regla": 3, "id_cliente": 3, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(8, 0), "hora_fin": time(12, 0), "es_restriccion_dura": True, "activa": True},
    {"id_regla": 4, "id_cliente": 4, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(14, 0), "hora_fin": time(17, 0), "es_restriccion_dura": True, "activa": True},
    {"id_regla": 5, "id_cliente": 5, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(9, 0), "hora_fin": time(10, 0), "es_restriccion_dura": True, "activa": True},
    {"id_regla": 6, "id_cliente": 6, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(8, 0), "hora_fin": time(14, 0), "es_restriccion_dura": False, "activa": True},
    {"id_regla": 7, "id_cliente": 7, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(10, 0), "hora_fin": time(16, 0), "es_restriccion_dura": False, "activa": True},
    {"id_regla": 8, "id_cliente": 8, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(9, 0), "hora_fin": time(15, 0), "es_restriccion_dura": False, "activa": True},
    {"id_regla": 9, "id_cliente": 9, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(13, 0), "hora_fin": time(18, 0), "es_restriccion_dura": True, "activa": True},
    {"id_regla": 10, "id_cliente": 10, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(9, 0), "hora_fin": time(15, 0), "es_restriccion_dura": False, "activa": True},
    {"id_regla": 11, "id_cliente": 11, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(8, 0), "hora_fin": time(13, 0), "es_restriccion_dura": False, "activa": True},
    {"id_regla": 12, "id_cliente": 12, "tipo_regla": "VENTANA_HORARIA", "hora_inicio": time(8, 0), "hora_fin": time(13, 0), "es_restriccion_dura": True, "activa": True}
]

PEDIDOS_DEMO = [
    {"id_pedido": 9301982, "codigo_externo": "9301982", "id_cliente": 1, "id_vehiculo": 1, "peso_kg": 520.0, "volumen_m3": 1.15, "importe": 850.0},
    {"id_pedido": 9300963, "codigo_externo": "9300963", "id_cliente": 2, "id_vehiculo": 3, "peso_kg": 1881.0, "volumen_m3": 0.12, "importe": 3100.0},
    {"id_pedido": 9300778, "codigo_externo": "9300778", "id_cliente": 3, "id_vehiculo": 2, "peso_kg": 800.0, "volumen_m3": 0.31, "importe": 1600.0},
    {"id_pedido": 9300891, "codigo_externo": "9300891", "id_cliente": 4, "id_vehiculo": 4, "peso_kg": 3500.0, "volumen_m3": 0.17, "importe": 5400.0},
    {"id_pedido": 3881628, "codigo_externo": "3881628", "id_cliente": 5, "id_vehiculo": 5, "peso_kg": 2434.0, "volumen_m3": 0.63, "importe": 4200.0},
    {"id_pedido": 9303910, "codigo_externo": "9303910", "id_cliente": 6, "id_vehiculo": 1, "peso_kg": 420.0, "volumen_m3": 0.85, "importe": 2340.0},
    {"id_pedido": 9301880, "codigo_externo": "9301880", "id_cliente": 7, "id_vehiculo": 3, "peso_kg": 640.0, "volumen_m3": 0.55, "importe": 1760.0},
    {"id_pedido": 9303120, "codigo_externo": "9303120", "id_cliente": 8, "id_vehiculo": 3, "peso_kg": 720.0, "volumen_m3": 0.90, "importe": 1340.0},
    {"id_pedido": 9303380, "codigo_externo": "9303380", "id_cliente": 9, "id_vehiculo": 4, "peso_kg": 950.0, "volumen_m3": 1.10, "importe": 1100.0},
    {"id_pedido": 9400137, "codigo_externo": "9400137", "id_cliente": 10, "id_vehiculo": 1, "peso_kg": 310.0, "volumen_m3": 0.40, "importe": 310.0},
    {"id_pedido": 9400248, "codigo_externo": "9400248", "id_cliente": 11, "id_vehiculo": 5, "peso_kg": 540.0, "volumen_m3": 0.70, "importe": 780.0},
    {"id_pedido": 9400285, "codigo_externo": "9400285", "id_cliente": 12, "id_vehiculo": 5, "peso_kg": 410.0, "volumen_m3": 0.50, "importe": 340.0}
]

async def sembrar_datos_iniciales(db: AsyncSession):
    # 1. Sembrar Roles
    for rd in ROLES_DEMO:
        res = await db.execute(select(Rol).where(Rol.id_rol == rd["id_rol"]))
        if not res.scalars().first():
            db.add(Rol(id_rol=rd["id_rol"], nombre=rd["nombre"], descripcion=rd["descripcion"]))
    await db.flush()

    # 2. Sembrar Usuarios
    for ud in USUARIOS_DEMO:
        res = await db.execute(select(Usuario).where((Usuario.correo == ud["correo"]) | (Usuario.id_usuario == ud["id_usuario"])))
        if not res.scalars().first():
            u = Usuario(
                id_usuario=ud["id_usuario"],
                id_rol=ud["id_rol"],
                nombres=ud["nombres"],
                apellidos=ud["apellidos"],
                correo=ud["correo"],
                nombre_usuario=ud["correo"].split("@")[0],
                password_hash=hash_contrasena(ud["clave"]),
                activo=True
            )
            db.add(u)
    await db.flush()

    # 3. Sembrar Vehículos
    for vd in VEHICULOS_DEMO:
        res = await db.execute(select(Vehiculo).where(Vehiculo.placa == vd["placa"]))
        if not res.scalars().first():
            v = Vehiculo(
                id_vehiculo=vd["id_vehiculo"],
                codigo_externo=vd["codigo_externo"],
                placa=vd["placa"],
                marca=vd["marca"],
                modelo=vd["modelo"],
                capacidad_kg=vd["capacidad_kg"],
                capacidad_m3=vd["capacidad_m3"],
                estado=vd["estado"],
                activo=True
            )
            db.add(v)
    await db.flush()

    # 4. Sembrar Clientes
    for cd in CLIENTES_DEMO:
        res = await db.execute(select(Cliente).where(Cliente.id_cliente == cd["id_cliente"]))
        if not res.scalars().first():
            c = Cliente(
                id_cliente=cd["id_cliente"],
                codigo_externo=cd["codigo_externo"],
                razon_social=cd["razon_social"],
                direccion=cd["direccion"],
                distrito=cd["distrito"],
                provincia="Lima",
                latitud=cd["latitud"],
                longitud=cd["longitud"],
                activo=True
            )
            db.add(c)
    await db.flush()

    # 5. Sembrar Reglas de Cliente
    for rg in REGLAS_DEMO:
        res = await db.execute(select(ReglaCliente).where(ReglaCliente.id_regla == rg["id_regla"]))
        if not res.scalars().first():
            r = ReglaCliente(
                id_regla=rg["id_regla"],
                id_cliente=rg["id_cliente"],
                tipo_regla=rg["tipo_regla"],
                hora_inicio=rg["hora_inicio"],
                hora_fin=rg["hora_fin"],
                es_restriccion_dura=rg["es_restriccion_dura"],
                activa=rg["activa"]
            )
            db.add(r)
    await db.flush()

    # 6. Sembrar Pedidos
    for pd in PEDIDOS_DEMO:
        res = await db.execute(select(Pedido).where(Pedido.id_pedido == pd["id_pedido"]))
        if not res.scalars().first():
            p = Pedido(
                id_pedido=pd["id_pedido"],
                codigo_externo=pd["codigo_externo"],
                id_cliente=pd["id_cliente"],
                id_vehiculo=pd["id_vehiculo"],
                fecha_pedido=datetime.now(),
                fecha_programada=date(2026, 8, 27),
                peso_kg=pd["peso_kg"],
                volumen_m3=pd["volumen_m3"],
                importe=pd["importe"],
                estado="PENDIENTE",
                habilitado_despacho=True,
                origen="TOMAPEDIDOS"
            )
            db.add(p)
    await db.flush()

    # 7. Registrar auditoría inicial
    res_aud = await db.execute(select(Auditoria).limit(1))
    if not res_aud.scalars().first():
        db.add(Auditoria(
            id_usuario=1,
            entidad="sistema",
            id_entidad=1,
            accion="CREAR",
            valor_anterior=None,
            valor_nuevo={"descripcion": "Base de datos inicializada y alineada con siprd_db.backup"}
        ))

    await db.flush()
    if SCHEMA:
        # Los datos iniciales usan IDs explicitos: avanzar las secuencias evita
        # colisiones al registrar el siguiente usuario, cliente o pedido.
        for table in Base.metadata.sorted_tables:
            for column in table.primary_key.columns:
                if column.autoincrement is True:
                    qualified = f'{table.schema}.{table.name}'
                    await db.execute(text(
                        f"SELECT setval(pg_get_serial_sequence('{qualified}', '{column.name}'), "
                        f"COALESCE(MAX({column.name}), 1), COUNT(*) > 0) FROM {qualified}"
                    ))
    await db.commit()


async def inicializar_bd():
    async with engine.begin() as conn:
        if SCHEMA:
            await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA};"))
        await conn.run_sync(Base.metadata.create_all)
        from backend.app.migraciones import migrar
        await migrar(conn)

    async with AsyncSessionLocal() as session:
        await sembrar_datos_iniciales(session)
        if settings.DATOS_DEMO:
            from backend.app.datos_demo import cargar_demo
            await cargar_demo(session)


if __name__ == "__main__":
    asyncio.run(inicializar_bd())
