"""Inicialización segura.

El esquema de 13 tablas se administra mediante schema_siprd_grupo.sql. La API no
crea tablas ni inserta datos de demostración al iniciar, para no alterar Neon.
"""
from sqlalchemy import text
from backend.app.core.db import AsyncSessionLocal

async def inicializar_bd():
    async with AsyncSessionLocal() as session:
        # Confirma que la migración física fue aplicada antes de atender peticiones.
        await session.execute(text("SELECT 1 FROM siprd.roles LIMIT 1"))

if __name__ == "__main__":
    import asyncio
    asyncio.run(inicializar_bd())
