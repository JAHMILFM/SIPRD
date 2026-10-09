"""
Script para restaurar o aplicar el esquema formal PostgreSQL (siprd_db.backup).
Permite conexión directa con PostgreSQL vía asyncpg o psycopg.
"""
import os
import sys
import asyncio
from pathlib import Path

# Agregar directorio raíz al path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.core.config import settings

SQL_FILE = Path(__file__).resolve().parent.parent / "app" / "schema_siprd.sql"

async def aplicar_esquema_postgres():
    import asyncpg

    print(f"[*] Conectando a PostgreSQL ({settings.POSTGRES_HOST}:{settings.POSTGRES_PORT})...")
    try:
        # 1. Conectar a postgres para asegurar que exista siprd_db
        conn_admin = await asyncpg.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT,
            database="postgres"
        )
        
        # Verificar existencia de siprd_db
        existe = await conn_admin.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", settings.POSTGRES_DB
        )
        if not existe:
            print(f"[+] Creando base de datos {settings.POSTGRES_DB}...")
            await conn_admin.execute(f'CREATE DATABASE "{settings.POSTGRES_DB}";')
        await conn_admin.close()

        # 2. Conectar a siprd_db y aplicar schema_siprd.sql
        print(f"[*] Conectando a {settings.POSTGRES_DB}...")
        conn_db = await asyncpg.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT,
            database=settings.POSTGRES_DB
        )

        with open(SQL_FILE, "r", encoding="utf-8") as f:
            sql_content = f.read()

        print("[*] Aplicando DDL de schema_siprd.sql (11 tablas, PKs, FKs, Índices)...")
        await conn_db.execute(sql_content)
        print("[✓] Esquema siprd y tablas creados exitosamente en PostgreSQL.")
        await conn_db.close()

        # 3. Sembrar datos
        print("[*] Sembrando datos iniciales en PostgreSQL...")
        from backend.app.seed import inicializar_bd
        await inicializar_bd()
        print("[✓] Datos iniciales sincronizados exitosamente en PostgreSQL!")

    except Exception as err:
        print(f"[!] Error al conectar con PostgreSQL: {err}")
        print("[i] Asegúrate de que el servicio PostgreSQL esté activo en el puerto 5432.")

if __name__ == "__main__":
    asyncio.run(aplicar_esquema_postgres())
