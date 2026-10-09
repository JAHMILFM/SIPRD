from datetime import datetime
try:
    from zoneinfo import ZoneInfo
    ZONA_LIMA = ZoneInfo("America/Lima")
except Exception:
    from datetime import timezone, timedelta
    ZONA_LIMA = timezone(timedelta(hours=-5))

def ahora() -> datetime:
    """Devuelve la fecha y hora actual en la zona horaria America/Lima."""
    return datetime.now(ZONA_LIMA)

