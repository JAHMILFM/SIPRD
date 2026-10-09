from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os

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
    DATABASE_URL: str = Field(default_factory=lambda: os.getenv(
        "DATABASE_URL", 
        f"sqlite+aiosqlite:///{os.path.abspath('backend/siprd_dev.db')}"
    ))
    
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
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
