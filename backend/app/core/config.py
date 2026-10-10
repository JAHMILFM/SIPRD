from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List
import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

class Settings(BaseSettings):
    APP_NAME: str = "SIPRD API"
    VERSION: str = "0.2.0"
    ENTORNO: str = "desarrollo"
    DEBUG: bool = True
    
    # Configuración PostgreSQL formal (siprd_db)
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "siprd_db")

    # Base de datos: por defecto PostgreSQL si está configurado, con soporte a SQLite local
    DATABASE_URL: str = Field(default_factory=lambda: _async_database_url(os.getenv(
        "DATABASE_URL",
        f"sqlite+aiosqlite:///{os.path.abspath('backend/siprd_dev.db')}"
    )))
    
    # Seguridad
    JWT_SECRET: str = "siprd-secret-key-super-secure-production-ready-2026-alfa-distribuidores"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Almacenamiento de evidencias y comprobantes
    UPLOAD_DIR: str = os.path.abspath("backend/uploads")
    
    # Motor de optimización interno
    MOTOR_URL: str = "http://127.0.0.1:8001"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalizar_url_asincrona(cls, value: str) -> str:
        return _async_database_url(value)
    
    class Config:
        env_file = ".env"
        extra = "allow"

def _async_database_url(url: str) -> str:
    """Normaliza URLs PostgreSQL para el motor async de SQLAlchemy.

    asyncpg evita la incompatibilidad de psycopg async con ProactorEventLoop
    de Windows durante el desarrollo local.
    """
    if url.startswith("postgresql+psycopg://"):
        url = "postgresql+asyncpg://" + url.removeprefix("postgresql+psycopg://")
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url.removeprefix("postgresql://")
    # asyncpg uses `ssl`, whereas libpq/psycopg uses `sslmode`; it does
    # not understand libpq's channel_binding parameter.
    parts = urlsplit(url)
    parametros = []
    for clave, valor in parse_qsl(parts.query, keep_blank_values=True):
        if clave == "channel_binding":
            continue
        parametros.append(("ssl" if clave == "sslmode" else clave, valor))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(parametros), parts.fragment))

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
