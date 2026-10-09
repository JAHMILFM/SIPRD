import os
import uuid
from fastapi import UploadFile
from backend.app.core.config import settings
from backend.app.core.errores import ErrorDominio

TIPOS_PERMITIDOS = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024  # 5 MB

async def guardar_archivo(archivo: UploadFile, subcarpeta: str = "general") -> dict:
    """Valida y almacena un archivo de evidencia o comprobante."""
    if archivo.content_type not in TIPOS_PERMITIDOS:
        raise ErrorDominio(
            codigo="FORMATO_INVALIDO",
            mensaje=f"Formato no permitido: {archivo.content_type}. Solo se aceptan JPEG, PNG, WebP o PDF."
        )
    
    contenido = await archivo.read()
    tamano = len(contenido)
    if tamano > TAMANO_MAXIMO_BYTES:
        raise ErrorDominio(
            codigo="ARCHIVO_MUY_PESADO",
            mensaje="El archivo supera el tamaño máximo permitido de 5 MB."
        )
    
    destino_dir = os.path.join(settings.UPLOAD_DIR, subcarpeta)
    os.makedirs(destino_dir, exist_ok=True)
    
    extension = archivo.filename.split(".")[-1] if "." in archivo.filename else "bin"
    nombre_seguro = f"{uuid.uuid4().hex}.{extension}"
    ruta_completa = os.path.join(destino_dir, nombre_seguro)
    
    with open(ruta_completa, "wb") as f:
        f.write(contenido)
        
    clave_archivo = f"{subcarpeta}/{nombre_seguro}"
    return {
        "clave_archivo": clave_archivo,
        "tamano_bytes": tamano,
        "tipo_mime": archivo.content_type,
        "nombre_original": archivo.filename
    }
