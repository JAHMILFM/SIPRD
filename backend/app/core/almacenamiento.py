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
            mensaje=f"Formato no permitido: {archivo.content_type}. Solo se aceptan JPEG, PNG, WebP o PDF.",
        )

    contenido = await archivo.read(TAMANO_MAXIMO_BYTES + 1)
    tamano = len(contenido)
    if tamano > TAMANO_MAXIMO_BYTES:
        raise ErrorDominio(
            codigo="ARCHIVO_MUY_PESADO",
            mensaje="El archivo supera el tamaño máximo permitido de 5 MB.",
        )

    firmas = {
        "image/png": contenido.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": contenido.startswith(b"\xff\xd8\xff"),
        "image/webp": contenido[:4] == b"RIFF" and contenido[8:12] == b"WEBP",
        "application/pdf": contenido.startswith(b"%PDF-"),
    }
    if not firmas.get(archivo.content_type):
        raise ErrorDominio(
            codigo="ARCHIVO_INVALIDO",
            mensaje="El contenido del archivo no corresponde al formato declarado.",
        )
    destino_dir = os.path.join(settings.UPLOAD_DIR, subcarpeta)
    os.makedirs(destino_dir, exist_ok=True)

    extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
    }[archivo.content_type]
    nombre_seguro = f"{uuid.uuid4().hex}.{extension}"
    ruta_completa = os.path.join(destino_dir, nombre_seguro)

    with open(ruta_completa, "wb") as f:
        f.write(contenido)

    clave_archivo = f"{subcarpeta}/{nombre_seguro}"
    return {
        "clave_archivo": clave_archivo,
        "tamano_bytes": tamano,
        "tipo_mime": archivo.content_type,
        "nombre_original": archivo.filename,
    }
