import os
import uuid
from fastapi import UploadFile
from backend.app.core.config import settings
from backend.app.core.errores import ErrorDominio

TAMANO_MAXIMO_BYTES=5*1024*1024

async def guardar_archivo(archivo:UploadFile,subcarpeta="general",solo_imagen=False):
    contenido=await archivo.read(TAMANO_MAXIMO_BYTES+1)
    if len(contenido)>TAMANO_MAXIMO_BYTES:
        raise ErrorDominio("ARCHIVO_MUY_PESADO","El archivo supera los 5 MB")
    mime=None;extension=None
    if contenido.startswith(b"\x89PNG\r\n\x1a\n") and len(contenido)>=24:mime,extension="image/png","png"
    elif contenido.startswith(b"\xff\xd8\xff") and contenido.endswith(b"\xff\xd9"):mime,extension="image/jpeg","jpg"
    elif contenido[:4]==b"RIFF" and contenido[8:12]==b"WEBP":mime,extension="image/webp","webp"
    elif contenido.startswith(b"%PDF-") and b"%%EOF" in contenido[-1024:]:mime,extension="application/pdf","pdf"
    if not mime or (solo_imagen and not mime.startswith("image/")) or mime!=archivo.content_type:
        raise ErrorDominio("FORMATO_INVALIDO","Adjunta una imagen JPEG, PNG o WebP válida" if solo_imagen else "Adjunta una imagen o PDF válido; el contenido debe corresponder al formato declarado")
    destino=os.path.join(settings.UPLOAD_DIR,subcarpeta);os.makedirs(destino,exist_ok=True)
    clave=f"{subcarpeta}/{uuid.uuid4().hex}.{extension}"
    with open(os.path.join(settings.UPLOAD_DIR,clave),"wb") as f:f.write(contenido)
    return dict(clave_archivo=clave,tamano_bytes=len(contenido),tipo_mime=mime,nombre_original=os.path.basename(archivo.filename or f"archivo.{extension}"))
