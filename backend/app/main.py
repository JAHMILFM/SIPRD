import uuid
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.errores import ErrorDominio, manejador_error_dominio
from backend.app.core.logging import configurar_logging, logger
from backend.app.core.db import engine, Base, AsyncSessionLocal
from backend.app.seed import inicializar_bd

# Importar routers modulares
from backend.app.modules.auth.router import router as auth_router
from backend.app.modules.usuarios.router import router as usuarios_router
from backend.app.modules.vehiculos.router import router as vehiculos_router
from backend.app.modules.clientes.router import router as clientes_router
from backend.app.modules.pedidos.router import router as pedidos_router
from backend.app.modules.planificacion.router import router as planificacion_router
from backend.app.modules.reparto.router import router as reparto_router
from backend.app.modules.incidencias.router import router as incidencias_router
from backend.app.modules.cobranzas.router import router as cobranzas_router
from backend.app.modules.auditoria.router import router as auditoria_router

configurar_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización de tablas y datos semilla al arrancar
    logger.info("Iniciando SIPRD Backend y verificando base de datos...")
    await inicializar_bd()
    logger.info("Base de datos sincronizada y datos semilla listos.")
    yield
    # Limpieza al cerrar
    await engine.dispose()
    logger.info("SIPRD Backend apagado ordenadamente.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="API Monolítica Modular Hexagonal de SIPRD (Alfa Distribuidores S.A.)",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware de request_id y structlog
@app.middleware("http")
async def structlog_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    inicio = time.time()
    response = await call_next(request)
    duracion = time.time() - inicio
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "http_peticion",
        metodo=request.method,
        ruta=request.url.path,
        status=response.status_code,
        duracion_ms=round(duracion * 1000, 2),
        request_id=request_id
    )
    return response

# Manejador global de excepciones de dominio
app.add_exception_handler(ErrorDominio, manejador_error_dominio)

# Liveness y Readiness
@app.get("/salud", tags=["Sistema"])
@app.get("/api/v1/salud", tags=["Sistema"])
async def salud():
    return {
        "estado": "OK",
        "sistema": "SIPRD API",
        "version": settings.VERSION,
        "entorno": settings.ENTORNO
    }

from sqlalchemy import select, text
from backend.app.models import Usuario

@app.get("/listo", tags=["Sistema"])
async def listo():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(select(Usuario).limit(1))
            motor = session.bind.dialect.name
            database = (await session.execute(text("SELECT current_database()"))).scalar_one() if motor == "postgresql" else "sqlite"
        return {"estado": "LISTO", "bd": "CONECTADA", "motor": motor, "base_datos": database}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"estado": "NO_LISTO", "detalle": str(e)}
        )

# Montar routers bajo /api/v1
app.include_router(auth_router, prefix="/api/v1")
app.include_router(usuarios_router, prefix="/api/v1")
app.include_router(vehiculos_router, prefix="/api/v1")
app.include_router(clientes_router, prefix="/api/v1")

app.include_router(pedidos_router, prefix="/api/v1")
app.include_router(planificacion_router, prefix="/api/v1")
app.include_router(reparto_router, prefix="/api/v1")
app.include_router(incidencias_router, prefix="/api/v1")
app.include_router(cobranzas_router, prefix="/api/v1")
app.include_router(auditoria_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=settings.SIPRD_API_PORT, reload=True)

from backend.app.datos_web import router as datos_router
app.include_router(datos_router, prefix="/api/v1")
