from fastapi import Request, status
from fastapi.responses import JSONResponse
from typing import Any, Optional

class ErrorDominio(Exception):
    """Excepción base para errores de reglas de negocio y dominio."""
    def __init__(self, codigo: str, mensaje: str, detalle: Optional[Any] = None, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalle = detalle
        self.status_code = status_code
        super().__init__(mensaje)

class ErrorNoEncontrado(ErrorDominio):
    def __init__(self, entidad: str, identificador: Any):
        super().__init__(
            codigo=f"{entidad.upper()}_NO_ENCONTRADO",
            mensaje=f"{entidad} con ID {identificador} no fue encontrado.",
            status_code=status.HTTP_404_NOT_FOUND
        )

class ErrorReglaNegocio(ErrorDominio):
    def __init__(self, regla: str, mensaje: str, detalle: Optional[Any] = None):
        super().__init__(
            codigo=regla,
            mensaje=mensaje,
            detalle=detalle,
            status_code=status.HTTP_409_CONFLICT
        )

class ErrorNoAutorizado(ErrorDominio):
    def __init__(self, mensaje: str = "Credenciales inválidas o no proporcionadas"):
        super().__init__(
            codigo="NO_AUTORIZADO",
            mensaje=mensaje,
            status_code=status.HTTP_401_UNAUTHORIZED
        )

class ErrorAccesoDenegado(ErrorDominio):
    def __init__(self, mensaje: str = "No cuenta con los permisos necesarios"):
        super().__init__(
            codigo="ACCESO_DENEGADO",
            mensaje=mensaje,
            status_code=status.HTTP_403_FORBIDDEN
        )

async def manejador_error_dominio(request: Request, exc: ErrorDominio):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "codigo": exc.codigo,
            "mensaje": exc.mensaje,
            "detalle": exc.detalle
        }
    )
