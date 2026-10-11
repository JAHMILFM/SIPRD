"""Datos sintéticos idempotentes para una jornada de seis vehículos.
Ejecutar desde la raíz: python -m backend.scripts.preparar_demo_zonas [--fecha AAAA-MM-DD]
Solo actualiza ubicaciones de pedidos sintéticos abiertos; los códigos DEMO6 identifican la demostración.
"""

import argparse, os
from datetime import date, datetime
from zoneinfo import ZoneInfo
from decimal import Decimal
import psycopg
from dotenv import load_dotenv
from backend.app.core.seguridad import hash_contrasena

load_dotenv()
parser = argparse.ArgumentParser()
parser.add_argument(
    "--fecha",
    type=date.fromisoformat,
    default=datetime.now(ZoneInfo("America/Lima")).date(),
)
args = parser.parse_args()
url = os.getenv("DATABASE_URL_DIRECT") or os.getenv("DATABASE_URL")
if not url:
    raise SystemExit("Configure DATABASE_URL")
url = url.replace("postgresql+asyncpg://", "postgresql://").replace(
    "postgresql+psycopg://", "postgresql://"
)
with psycopg.connect(url) as con:
    with con.cursor() as c:
        for name, rol in [
            ("asistente", "ASISTENTE_DISTRIBUCION"),
            ("jefe", "JEFE_DISTRIBUCION"),
            ("tesoreria", "TESORERIA"),
            ("admin", "ADMINISTRADOR"),
        ]:
            c.execute(
                "INSERT INTO siprd.usuarios(id_rol,nombres,apellidos,correo,nombre_usuario,password_hash) SELECT id_rol,%s,'Demostración',%s,%s,%s FROM siprd.roles WHERE nombre=%s ON CONFLICT(correo) DO NOTHING",
                (
                    name.capitalize(),
                    f"demo6.{name}@siprd.example",
                    f"demo.{name}",
                    hash_contrasena("SiprdDemo2026!"),
                    rol,
                ),
            )
        for i in range(1, 7):
            c.execute(
                "INSERT INTO siprd.vehiculos(codigo_externo,placa,marca,modelo,capacidad_kg,capacidad_m3,estado_operativo) VALUES (%s,%s,'DEMO','Reparto urbano',1500,8,'DISPONIBLE') ON CONFLICT(codigo_externo) DO NOTHING",
                (f"DEMO6-V{i}", f"FIC-{i:03}"),
            )
        # Coordenadas sintéticas distribuidas por sectores urbanos, todas pertenecen a su zona.
        zonas = [
            ('NORTE', 24, -11.955, -77.080, 0.012, 0.014),
            ('SUR', 24, -12.165, -76.990, 0.011, 0.015),
            ('ESTE', 12, -12.025, -76.945, 0.014, 0.015),
            ('CENTRO', 12, -12.046, -77.074, 0.018, 0.018),
        ]
        from motor.motor.zonas import zona_de
        for zona, n, lat, lon, dy, dx in zonas:
            for i in range(n):
                code = f'DEMO6-{zona}-{i + 1:02}'
                # Puntos separados entre aproximadamente 1.4 y 2.6 km,
                # distribuidos por varios sectores urbanos dentro de la misma zona.
                y = round(lat - (i // 4) * dy + (i % 2) * 0.001, 6)
                x = round(lon + (i % 4) * dx + (i // 4) * (0.006 if zona == 'SUR' else 0.010 if zona == 'CENTRO' else 0.0) + (i // 4 % 2) * 0.001, 6)
                assert zona_de(y, x) == zona, (code,y,x)
                c.execute(
                    "INSERT INTO siprd.clientes(codigo_externo,razon_social,direccion,distrito,provincia,latitud,longitud) VALUES (%s,%s,%s,%s,'Lima',%s,%s) ON CONFLICT(codigo_externo) DO NOTHING",
                    (
                        code,
                        f"Cliente ficticio {zona} {i + 1:02}",
                        f"Punto de demostración {zona} {i + 1:02}",
                        zona,
                        y,
                        x,
                    ),
                )
                c.execute(
                    "SELECT id_cliente FROM siprd.clientes WHERE codigo_externo=%s",
                    (code,),
                )
                cliente = c.fetchone()[0]
                c.execute(
                    "INSERT INTO siprd.restricciones_cliente(id_cliente,tipo_restriccion,hora_inicio,hora_fin,observacion) SELECT %s,'VENTANA_HORARIA','08:00','15:00','Horario de recepción de demostración' WHERE NOT EXISTS (SELECT 1 FROM siprd.restricciones_cliente WHERE id_cliente=%s AND observacion='Horario de recepción de demostración')",
                    (cliente, cliente),
                )
                c.execute(
                    "INSERT INTO siprd.pedidos(codigo_externo,id_cliente,fecha_pedido,fecha_programada,peso_kg,volumen_m3,importe_total,estado,habilitado_despacho,origen,latitud_entrega,longitud_entrega) VALUES (%s,%s,now(),%s,120,0.35,%s,'PENDIENTE',true,'DEMO_ZONAS',%s,%s) ON CONFLICT(codigo_externo) DO NOTHING",
                    (
                        f"{code}-{args.fecha}",
                        cliente,
                        args.fecha,
                        Decimal("120") + i * 5,
                        y,
                        x,
                    ),
                )
        for zona,n,lat,lon,dy,dx in zonas:
            for i in range(n):
                code=f'DEMO6-{zona}-{i+1:02}'
                y=round(lat-(i//4)*dy+(i%2)*0.001,6)
                x=round(lon+(i%4)*dx+(i//4)*(0.006 if zona=='SUR' else 0.010 if zona=='CENTRO' else 0.0)+(i//4%2)*0.001,6)
                c.execute('UPDATE siprd.clientes SET latitud=%s,longitud=%s WHERE codigo_externo=%s',(y,x,code))
                c.execute("UPDATE siprd.pedidos SET latitud_entrega=%s,longitud_entrega=%s WHERE codigo_externo=%s AND cierre_financiero IS NULL AND estado IN ('PENDIENTE','PLANIFICADO')",(y,x,f'{code}-{args.fecha}'))
        c.execute(
            "SELECT count(*) FROM siprd.pedidos WHERE origen='DEMO_ZONAS' AND fecha_programada=%s",
            (args.fecha,),
        )
        print(
            "Jornada",
            args.fecha,
            ":",
            c.fetchone()[0],
            "pedidos sintéticos en la base de datos; seis vehículos FIC-001 a FIC-006.",
        )
