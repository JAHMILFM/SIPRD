import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.core.db import AsyncSessionLocal, engine, Base
from backend.app.core.seguridad import hash_contrasena
from backend.app.models import Usuario, Vehiculo, Cliente, Pedido, ImportacionPedidos, ReglaAtencion

USUARIOS_DEMO = [
    {
        "usuario": "dhuerta",
        "clave": "jefe123",
        "nombre": "Dennys",
        "apellidos": "Huerta",
        "correo": "dhuerta@alfadistribuidores.com",
        "rol": "JEFE"
    },
    {
        "usuario": "asistente",
        "clave": "dist123",
        "nombre": "Lesli",
        "apellidos": "Pomalaya",
        "correo": "lpomalaya@alfadistribuidores.com",
        "rol": "ASISTENTE"
    },
    {
        "usuario": "admin.ti",
        "clave": "ti2026",
        "nombre": "Administrador",
        "apellidos": "TI",
        "correo": "admin.ti@alfadistribuidores.com",
        "rol": "ADMINISTRADOR"
    },
    {
        "usuario": "repartidor1",
        "clave": "rep123",
        "nombre": "Elías",
        "apellidos": "López",
        "correo": "elopez@alfadistribuidores.com",
        "rol": "REPARTIDOR"
    },
    {
        "usuario": "tesoreria",
        "clave": "teso123",
        "nombre": "Mariana",
        "apellidos": "Vásquez",
        "correo": "tesoreria@alfadistribuidores.com",
        "rol": "TESORERIA"
    }
]

VEHICULOS_DEMO = [
    {"placa": "BCE-869", "marca": "Hyundai", "modelo": "HD78", "conductor": "Elías López", "peso_kg": 12000, "vol_m3": 32, "inicio": "07:30", "fin": "17:30"},
    {"placa": "DB8-877", "marca": "Toyota", "modelo": "Dyna", "conductor": "Marcos Camacho", "peso_kg": 12000, "vol_m3": 32, "inicio": "07:30", "fin": "17:30"},
    {"placa": "AFG-747", "marca": "Suzuki", "modelo": "Super Carry", "conductor": "Giancarlo Ruiz", "peso_kg": 8000, "vol_m3": 21, "inicio": "07:30", "fin": "17:30"},
    {"placa": "BHL-751", "marca": "Kia", "modelo": "Bongo", "conductor": "Kevin Vargas", "peso_kg": 8000, "vol_m3": 21, "inicio": "07:30", "fin": "17:30"},
    {"placa": "XXX-000", "marca": "Isuzu", "modelo": "N-Series", "conductor": "Maycol Yance", "peso_kg": 8000, "vol_m3": 21, "inicio": "07:30", "fin": "17:30"}
]

PEDIDOS_DEMO = [
    {"cod": "9301982", "cli": "QUIÑONES VALENZUELA, VIRGINIA", "dir": "Jr. Madre Selva 592, Urb. Santa Isabel", "dist": "Carabayllo", "lat": -11.8700, "lon": -77.0300, "peso": 520, "vol": 1.15, "importe": 850.0, "serv": 15},
    {"cod": "9301307", "cli": "MORILLO, ALEJANDRINA", "dir": "Av. Los Incas 570, San Juan Bautista", "dist": "Comas", "lat": -11.9300, "lon": -77.0500, "peso": 812, "vol": 1.42, "importe": 1240.0, "serv": 18},
    {"cod": "9300511", "cli": "GRUPO PURPURA E.I.R.L.", "dir": "Av. Guillermo de la Fuente 317, Urb. Santa Luzmila", "dist": "Comas", "lat": -11.9250, "lon": -77.0600, "peso": 324, "vol": 0.96, "importe": 490.0, "serv": 15},
    {"cod": "9302657", "cli": "DDIVAS LANDEO E.I.R.L.", "dir": "Jr. Tacna 699, Urb. Orbea", "dist": "Magdalena del Mar", "lat": -12.0900, "lon": -77.0700, "peso": 519, "vol": 0.01, "importe": 980.0, "serv": 15},
    {"cod": "9300963", "cli": "FARMA IMPERIO S.A.C.", "dir": "Av. Los Jardines Este Mz B Lote 4", "dist": "San Juan de Lurigancho", "lat": -12.0100, "lon": -77.0000, "peso": 1881, "vol": 0.12, "importe": 3100.0, "serv": 45},
    {"cod": "3882660", "cli": "FLORERIA YURI S.A.", "dir": "Galería San Felipe Tda. 102", "dist": "Jesús María", "lat": -12.0800, "lon": -77.0500, "peso": 79, "vol": 0.004, "importe": 210.0, "serv": 15},
    {"cod": "9300047", "cli": "GAMBOA MARROQUIN, PATRICIA", "dir": "Mcdo. Pro Los Pinos 531, Puesto 56", "dist": "Chorrillos", "lat": -12.1800, "lon": -77.0200, "peso": 222, "vol": 0.01, "importe": 350.0, "serv": 15},
    {"cod": "9300891", "cli": "GRUPO FAMEZA S.A.C.", "dir": "Z.I. Parque Industrial del Cono Sur", "dist": "Villa El Salvador", "lat": -12.2100, "lon": -76.9400, "peso": 3500, "vol": 0.17, "importe": 5400.0, "serv": 15},
    {"cod": "3881628", "cli": "GRUPO LIVES S.A.", "dir": "Lote 2D 7E, Fundo Larrea Sub Lote A", "dist": "Lurín", "lat": -12.2600, "lon": -76.8800, "peso": 2434, "vol": 0.63, "importe": 4200.0, "serv": 45},
    {"cod": "3901336", "cli": "HERRERA DAMAS, ESTHER", "dir": "Av. Venezuela 2899 Int. 91", "dist": "Lima Cercado", "lat": -12.0600, "lon": -77.0700, "peso": 687, "vol": 0.04, "importe": 1150.0, "serv": 15},
    {"cod": "9301880", "cli": "BOTICAS BIOFARMAS SALUD Y VIDA S.A.C.", "dir": "Av. Próceres de la Independencia 1820", "dist": "San Juan de Lurigancho", "lat": -11.9900, "lon": -76.9900, "peso": 640, "vol": 0.55, "importe": 1320.0, "serv": 18},
    {"cod": "9300778", "cli": "RODRIGUEZ BERNAL RAMOS S.A.C.", "dir": "Av. Sáenz Peña 1120", "dist": "Callao", "lat": -12.0600, "lon": -77.1400, "peso": 800, "vol": 0.31, "importe": 1600.0, "serv": 20}
]

async def sembrar_datos_iniciales(db: AsyncSession):
    # 1. Sembrar Usuarios
    for ud in USUARIOS_DEMO:
        res = await db.execute(select(Usuario).where(Usuario.usuario == ud["usuario"]))
        if not res.scalars().first():
            u = Usuario(
                usuario=ud["usuario"],
                nombre=ud["nombre"],
                apellidos=ud["apellidos"],
                correo=ud["correo"],
                hash_contrasena=hash_contrasena(ud["clave"]),
                rol=ud["rol"],
                activo=True
            )
            db.add(u)
    
    # 2. Sembrar Vehículos
    for vd in VEHICULOS_DEMO:
        res = await db.execute(select(Vehiculo).where(Vehiculo.placa == vd["placa"]))
        if not res.scalars().first():
            v = Vehiculo(
                placa=vd["placa"],
                marca=vd["marca"],
                modelo=vd["modelo"],
                conductor=vd["conductor"],
                capacidad_peso_kg=vd["peso_kg"],
                capacidad_volumen_m3=vd["vol_m3"],
                inicio_jornada=vd["inicio"],
                fin_jornada=vd["fin"],
                estado_operativo="OPERATIVO",
                activo=True
            )
            db.add(v)
            
    # 3. Sembrar Clientes y Pedidos base
    for pd in PEDIDOS_DEMO:
        cli_res = await db.execute(select(Cliente).where(Cliente.nombre == pd["cli"]))
        cli = cli_res.scalars().first()
        if not cli:
            cli = Cliente(
                codigo_externo=f"CLI-{pd['cod']}",
                nombre=pd["cli"],
                direccion=pd["dir"],
                distrito=pd["dist"],
                lat=pd["lat"],
                lon=pd["lon"]
            )
            db.add(cli)
            await db.flush()

        ped_res = await db.execute(select(Pedido).where(Pedido.codigo_externo == pd["cod"]))
        if not ped_res.scalars().first():
            p = Pedido(
                codigo_externo=pd["cod"],
                cliente_id=cli.id,
                fecha_corte="27/08/2026",
                peso_kg=pd["peso"],
                volumen_m3=pd["vol"],
                importe_total=pd["importe"],
                tiempo_servicio_min=pd["serv"],
                estado="PENDIENTE"
            )
            db.add(p)

    await db.commit()

async def inicializar_bd():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await sembrar_datos_iniciales(session)

if __name__ == "__main__":
    asyncio.run(inicializar_bd())
