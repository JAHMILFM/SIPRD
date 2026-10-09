import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from backend.app.core.db import Base
from backend.app.core.tiempo import ahora

def generar_uuid() -> str:
    return str(uuid.uuid4())

# ── 1. Usuarios y Tokens ──────────────────────────────────────────
class Usuario(Base):
    __tablename__ = "usuario"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    correo = Column(String(150), unique=True, index=True, nullable=False)
    usuario = Column(String(50), unique=True, index=True, nullable=False)
    hash_contrasena = Column(String(255), nullable=False)
    rol = Column(String(30), nullable=False) # ADMINISTRADOR, JEFE, ASISTENTE, REPARTIDOR, TESORERIA
    activo = Column(Boolean, default=True, nullable=False)
    ultimo_acceso = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class TokenRefresco(Base):
    __tablename__ = "token_refresco"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    usuario_id = Column(String(36), ForeignKey("usuario.id"), nullable=False)
    hash_token = Column(String(255), unique=True, nullable=False)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    revocado = Column(Boolean, default=False, nullable=False)
    creado_en = Column(DateTime(timezone=True), default=ahora)

# ── 2. Vehículos ──────────────────────────────────────────────────
class Vehiculo(Base):
    __tablename__ = "vehiculo"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    placa = Column(String(15), unique=True, index=True, nullable=False)
    marca = Column(String(50), nullable=True)
    modelo = Column(String(50), nullable=True)
    conductor = Column(String(100), nullable=True)
    capacidad_peso_kg = Column(Float, nullable=False)
    capacidad_volumen_m3 = Column(Float, nullable=False)
    estado_operativo = Column(String(30), default="OPERATIVO", nullable=False) # OPERATIVO, MANTENIMIENTO, FUERA_DE_SERVICIO
    inicio_jornada = Column(String(10), default="07:30", nullable=False)
    fin_jornada = Column(String(10), default="17:30", nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), default=ahora)

# ── 3. Clientes y Reglas de Atención ──────────────────────────────
class Cliente(Base):
    __tablename__ = "cliente"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    codigo_externo = Column(String(50), unique=True, index=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    direccion = Column(String(250), nullable=False)
    distrito = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class ReglaAtencion(Base):
    __tablename__ = "regla_atencion"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    cliente_id = Column(String(36), ForeignKey("cliente.id"), nullable=False)
    tipo = Column(String(40), nullable=False) # DIAS_DISPONIBLES, DIAS_NO_DISPONIBLES, INTERVALO_HORARIO
    dias = Column(JSON, nullable=True) # [1, 2, 3, 4, 5]
    fecha = Column(String(20), nullable=True)
    hora_inicio = Column(String(10), nullable=True)
    hora_fin = Column(String(10), nullable=True)
    vigente_desde = Column(String(20), nullable=True)
    vigente_hasta = Column(String(20), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), default=ahora)

# ── 4. Pedidos e Importaciones ────────────────────────────────────
class ImportacionPedidos(Base):
    __tablename__ = "importacion_pedidos"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    fecha_corte = Column(String(20), nullable=False)
    origen = Column(String(50), default="SIMULADO", nullable=False)
    iniciada_por = Column(String(36), nullable=True)
    total_leidos = Column(Integer, default=0, nullable=False)
    total_nuevos = Column(Integer, default=0, nullable=False)
    total_rechazados = Column(Integer, default=0, nullable=False)
    detalle_errores = Column(JSON, default=list)
    estado = Column(String(30), default="COMPLETADA", nullable=False)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class Pedido(Base):
    __tablename__ = "pedido"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    codigo_externo = Column(String(50), unique=True, index=True, nullable=False)
    cliente_id = Column(String(36), ForeignKey("cliente.id"), nullable=False)
    fecha_corte = Column(String(20), nullable=False)
    peso_kg = Column(Float, nullable=False)
    volumen_m3 = Column(Float, nullable=False)
    importe_total = Column(Float, default=0.0, nullable=False)
    tiempo_servicio_min = Column(Integer, default=15, nullable=False)
    estado = Column(String(30), default="PENDIENTE", nullable=False) # PENDIENTE, PLANIFICADO, EN_RUTA, ENTREGADO, FALLIDO, CERRADO
    importacion_id = Column(String(36), ForeignKey("importacion_pedidos.id"), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora)

# ── 5. Planificación, Rutas y Paradas ─────────────────────────────
class Planificacion(Base):
    __tablename__ = "planificacion"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    fecha = Column(String(20), nullable=False, index=True)
    version_vigente = Column(Integer, default=1, nullable=False)
    creada_por = Column(String(36), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class PlanificacionVersion(Base):
    __tablename__ = "planificacion_version"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    planificacion_id = Column(String(36), ForeignKey("planificacion.id"), nullable=False)
    numero = Column(Integer, nullable=False)
    estado = Column(String(30), default="BORRADOR", nullable=False) # BORRADOR, CONFIRMADA, SUSTITUIDA, FINALIZADA
    motivo = Column(String(250), nullable=True)
    parametros = Column(JSON, default=dict)
    resumen = Column(JSON, default=dict)
    metodo = Column(String(50), default="HIBRIDO", nullable=False)
    creada_por = Column(String(36), nullable=True)
    confirmada_por = Column(String(36), nullable=True)
    confirmada_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class Ruta(Base):
    __tablename__ = "ruta"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    version_id = Column(String(36), ForeignKey("planificacion_version.id"), nullable=False)
    vehiculo_id = Column(String(36), ForeignKey("vehiculo.id"), nullable=False)
    repartidor_id = Column(String(36), ForeignKey("usuario.id"), nullable=True)
    salida = Column(String(10), default="08:00")
    regreso = Column(String(10), default="17:00")
    distancia_km = Column(Float, default=0.0)
    duracion_min = Column(Float, default=0.0)
    peso_kg = Column(Float, default=0.0)
    volumen_m3 = Column(Float, default=0.0)
    geometria = Column(JSON, nullable=True) # GeoJSON o lista de coordenadas
    creado_en = Column(DateTime(timezone=True), default=ahora)

class Parada(Base):
    __tablename__ = "parada"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    ruta_id = Column(String(36), ForeignKey("ruta.id"), nullable=False)
    pedido_id = Column(String(36), ForeignKey("pedido.id"), nullable=False)
    secuencia = Column(Integer, nullable=False)
    llegada = Column(String(10), nullable=True)
    inicio_atencion = Column(String(10), nullable=True)
    salida = Column(String(10), nullable=True)
    espera_min = Column(Float, default=0.0)
    estado = Column(String(30), default="PENDIENTE", nullable=False) # PENDIENTE, EN_CURSO, COMPLETADA, FALLIDA
    completada_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class PedidoNoAsignado(Base):
    __tablename__ = "pedido_no_asignado"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    version_id = Column(String(36), ForeignKey("planificacion_version.id"), nullable=False)
    pedido_id = Column(String(36), ForeignKey("pedido.id"), nullable=False)
    codigo = Column(String(50), nullable=False) # p.ej. CAPACIDAD_FLOTA_INSUFICIENTE
    motivo = Column(String(250), nullable=False)
    creado_en = Column(DateTime(timezone=True), default=ahora)

# ── 6. Reparto, Incidencias y Evidencias ───────────────────────────
class EvidenciaEntrega(Base):
    __tablename__ = "evidencia_entrega"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    parada_id = Column(String(36), ForeignKey("parada.id"), nullable=False)
    pedido_id = Column(String(36), ForeignKey("pedido.id"), nullable=False)
    clave_archivo = Column(String(255), nullable=False)
    tipo_mime = Column(String(50), nullable=False)
    tamano_bytes = Column(Integer, nullable=False)
    subida_por = Column(String(36), nullable=False)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class Incidencia(Base):
    __tablename__ = "incidencia"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    ruta_id = Column(String(36), ForeignKey("ruta.id"), nullable=False)
    parada_id = Column(String(36), ForeignKey("parada.id"), nullable=True)
    tipo = Column(String(50), nullable=False) # CLIENTE_AUSENTE, LOCAL_CERRADO, DIRECCION_ERRADA, MERCADERIA_RECHAZADA, AVERIA_VEHICULO, TRAFICO, OTRO
    descripcion = Column(Text, nullable=False)
    estado = Column(String(30), default="ABIERTA", nullable=False) # ABIERTA, EN_ATENCION, RESUELTA
    registrada_por = Column(String(36), nullable=False)
    atendida_por = Column(String(36), nullable=True)
    resolucion = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora)

# ── 7. Cobranzas ──────────────────────────────────────────────────
class Cobro(Base):
    __tablename__ = "cobro"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    pedido_id = Column(String(36), ForeignKey("pedido.id"), nullable=False)
    importe = Column(Float, nullable=False)
    medio_pago = Column(String(30), nullable=False) # EFECTIVO, YAPE, PLIN, TRANSFERENCIA, DEPOSITO
    numero_operacion = Column(String(100), nullable=True)
    estado = Column(String(30), default="PENDIENTE_CONTRASTE", nullable=False) # PENDIENTE_CONTRASTE, CONFORME, OBSERVADO
    registrado_por = Column(String(36), nullable=False)
    contrastado_por = Column(String(36), nullable=True)
    contrastado_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class ComprobantePago(Base):
    __tablename__ = "comprobante_pago"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    cobro_id = Column(String(36), ForeignKey("cobro.id"), nullable=False)
    clave_archivo = Column(String(255), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    vigente = Column(Boolean, default=True, nullable=False)
    subido_por = Column(String(36), nullable=False)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class ObservacionCobro(Base):
    __tablename__ = "observacion_cobro"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    cobro_id = Column(String(36), ForeignKey("cobro.id"), nullable=False)
    texto = Column(Text, nullable=False)
    registrada_por = Column(String(36), nullable=False)
    resuelta = Column(Boolean, default=False, nullable=False)
    resuelta_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora)

class AccesoComprobante(Base):
    __tablename__ = "acceso_comprobante"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    comprobante_id = Column(String(36), ForeignKey("comprobante_pago.id"), nullable=False)
    usuario_id = Column(String(36), ForeignKey("usuario.id"), nullable=False)
    fecha = Column(DateTime(timezone=True), default=ahora)
    accion = Column(String(20), default="VER", nullable=False) # VER, DESCARGAR

# ── 8. Auditoría Inmutable ────────────────────────────────────────
class Auditoria(Base):
    __tablename__ = "auditoria"
    id = Column(String(36), primary_key=True, default=generar_uuid)
    usuario_id = Column(String(36), nullable=True)
    accion = Column(String(50), nullable=False) # INSERT, UPDATE, DELETE, LOGIN, APROBACION, etc.
    entidad = Column(String(50), nullable=False)
    entidad_id = Column(String(50), nullable=True)
    valores_antes = Column(JSON, nullable=True)
    valores_despues = Column(JSON, nullable=True)
    ip = Column(String(45), nullable=True)
    request_id = Column(String(50), nullable=True)
    fecha = Column(DateTime(timezone=True), default=ahora)
