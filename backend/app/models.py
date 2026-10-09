import uuid
from datetime import datetime, date, time
from typing import Optional
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, BigInteger, SmallInteger,
    DateTime, Date, Time, Text, ForeignKey, JSON, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from backend.app.core.db import Base
from backend.app.core.config import settings
from backend.app.core.tiempo import ahora

# Si conectamos a PostgreSQL, usamos el esquema 'siprd' formal del backup
SCHEMA = "siprd" if "postgresql" in settings.DATABASE_URL else None

def table_args(extra=None):
    args = {}
    if SCHEMA:
        args["schema"] = SCHEMA
    if extra:
        args.update(extra)
    return args if args else None

def fk_target(target: str) -> str:
    """Retorna 'siprd.tabla.col' si PostgreSQL, o 'tabla.col' en SQLite."""
    return f"{SCHEMA}.{target}" if SCHEMA else target

def pk_column(name=None):
    """Genera PK autoincrementable compatible con PostgreSQL (BIGINT IDENTITY) y SQLite (INTEGER AUTOINCREMENT)."""
    col_type = Integer().with_variant(BigInteger, "postgresql")
    if name:
        return Column(name, col_type, primary_key=True, autoincrement=True)
    return Column(col_type, primary_key=True, autoincrement=True)


# ── 1. Roles y Usuarios ──────────────────────────────────────────
class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = table_args()

    id_rol = pk_column("id_rol")
    nombre = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(255), nullable=True)

    usuarios = relationship("Usuario", back_populates="rol_rel")


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = table_args()

    id_usuario = pk_column("id_usuario")
    id_rol = Column(BigInteger, ForeignKey(fk_target("roles.id_rol")), nullable=False, default=1)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    correo = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), default=ahora, nullable=False)

    rol_rel = relationship("Rol", back_populates="usuarios", lazy="joined")
    tokens = relationship("TokenRefresco", back_populates="usuario_rel", cascade="all, delete-orphan")

    # Propiedades de compatibilidad
    @hybrid_property
    def id(self) -> str:
        return str(self.id_usuario)

    @id.expression
    def id(cls):
        return cls.id_usuario

    @property
    def nombre(self) -> str:
        return self.nombres

    @nombre.setter
    def nombre(self, val: str):
        self.nombres = val

    @hybrid_property
    def usuario(self) -> str:
        return self.correo.split("@")[0]

    @usuario.setter
    def usuario(self, val: str):
        pass

    @usuario.expression
    def usuario(cls):
        return cls.correo

    @property
    def hash_contrasena(self) -> str:
        return self.password_hash

    @hash_contrasena.setter
    def hash_contrasena(self, val: str):
        self.password_hash = val

    @property
    def rol(self) -> str:
        if self.rol_rel and self.rol_rel.nombre:
            return self.rol_rel.nombre.upper()
        # Mapeo según id_rol
        mapeo = {1: "JEFE", 2: "ASISTENTE", 3: "ADMINISTRADOR", 4: "REPARTIDOR", 5: "TESORERIA"}
        return mapeo.get(self.id_rol, "JEFE")

    @rol.setter
    def rol(self, val: str):
        mapeo = {"JEFE": 1, "ASISTENTE": 2, "ADMINISTRADOR": 3, "REPARTIDOR": 4, "TESORERIA": 5}
        self.id_rol = mapeo.get(str(val).upper(), 1)

    @property
    def ultimo_acceso(self):
        return None

    @ultimo_acceso.setter
    def ultimo_acceso(self, val):
        pass

    @property
    def creado_en(self):
        return self.fecha_creacion

    @creado_en.setter
    def creado_en(self, val):
        self.fecha_creacion = val


class TokenRefresco(Base):
    __tablename__ = "token_refresco"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    usuario_id = Column(BigInteger, ForeignKey(fk_target("usuarios.id_usuario")), nullable=False)
    hash_token = Column(String(255), unique=True, nullable=False)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    revocado = Column(Boolean, default=False, nullable=False)
    creado_en = Column(DateTime(timezone=True), default=ahora, nullable=False)

    usuario_rel = relationship("Usuario", back_populates="tokens")


# ── 2. Vehículos ──────────────────────────────────────────────────
class Vehiculo(Base):
    __tablename__ = "vehiculos"
    __table_args__ = table_args()

    id_vehiculo = pk_column("id_vehiculo")
    codigo_externo = Column(String(80), nullable=False, unique=True, default=lambda: f"VEH-{uuid.uuid4().hex[:6].upper()}")
    placa = Column(String(20), nullable=False, unique=True, index=True)
    marca = Column(String(80), nullable=True)
    modelo = Column(String(80), nullable=True)
    capacidad_kg = Column(Numeric(12, 2), nullable=False)
    capacidad_m3 = Column(Numeric(12, 3), nullable=False)
    estado = Column(String(20), default="DISPONIBLE", nullable=False) # DISPONIBLE, ASIGNADO, MANTENIMIENTO, INACTIVO
    activo = Column(Boolean, default=True, nullable=False)

    pedidos = relationship("Pedido", back_populates="vehiculo_rel")
    rutas = relationship("Ruta", back_populates="vehiculo_rel")

    # Propiedades de compatibilidad con interfaz y motor
    @hybrid_property
    def id(self) -> str:
        return str(self.id_vehiculo)

    @id.expression
    def id(cls):
        return cls.id_vehiculo

    @property
    def conductor(self) -> str:
        # Asignación referencial según conductor habitual
        conductores = {
            "BCE-869": "Elías López",
            "DB8-877": "Marcos Camacho",
            "AFG-747": "Giancarlo Ruiz",
            "BHL-751": "Kevin Vargas",
            "XXX-000": "Maycol Yance",
            "VEH-001": "Elías López",
            "VEH-002": "Marcos Camacho",
            "VEH-003": "Giancarlo Ruiz",
            "VEH-004": "Kevin Vargas",
            "VEH-005": "Maycol Yance"
        }
        return conductores.get(self.placa, conductores.get(self.codigo_externo, "Conductor Asignado"))

    @property
    def capacidad_peso_kg(self) -> float:
        return float(self.capacidad_kg)

    @property
    def capacidad_volumen_m3(self) -> float:
        return float(self.capacidad_m3)

    @property
    def pesoMax(self) -> float:
        return float(self.capacidad_kg) / 1000.0

    @property
    def volMax(self) -> float:
        return float(self.capacidad_m3)

    @property
    def inicio_jornada(self) -> str:
        return "07:30"

    @inicio_jornada.setter
    def inicio_jornada(self, val):
        pass

    @property
    def fin_jornada(self) -> str:
        return "17:30"

    @fin_jornada.setter
    def fin_jornada(self, val):
        pass

    @conductor.setter
    def conductor(self, val):
        pass

    @capacidad_peso_kg.setter
    def capacidad_peso_kg(self, val):
        self.capacidad_kg = val

    @capacidad_volumen_m3.setter
    def capacidad_volumen_m3(self, val):
        self.capacidad_m3 = val

    @hybrid_property
    def estado_operativo(self) -> str:
        if self.estado in ("DISPONIBLE", "ASIGNADO"):
            return "OPERATIVO"
        return "FUERA_DE_SERVICIO"

    @estado_operativo.setter
    def estado_operativo(self, val: str):
        if val == "OPERATIVO":
            self.estado = "DISPONIBLE"
        elif val in ("DISPONIBLE", "ASIGNADO", "MANTENIMIENTO", "INACTIVO"):
            self.estado = val
        else:
            self.estado = "INACTIVO"

    @estado_operativo.expression
    def estado_operativo(cls):
        return cls.estado



# ── 3. Clientes y Reglas de Atención ──────────────────────────────
class Cliente(Base):
    __tablename__ = "clientes"
    __table_args__ = table_args()

    id_cliente = pk_column("id_cliente")
    codigo_externo = Column(String(80), nullable=False, unique=True, index=True)
    razon_social = Column(String(200), nullable=False)
    direccion = Column(String(300), nullable=False)
    distrito = Column(String(100), nullable=True)
    provincia = Column(String(100), nullable=True, default="Lima")
    latitud = Column(Numeric(9, 6), nullable=False)
    longitud = Column(Numeric(9, 6), nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), default=ahora, nullable=False)

    pedidos = relationship("Pedido", back_populates="cliente_rel")
    reglas = relationship("ReglaCliente", back_populates="cliente_rel")

    # Propiedades de compatibilidad
    @hybrid_property
    def id(self) -> str:
        return str(self.id_cliente)

    @id.expression
    def id(cls):
        return cls.id_cliente

    @property
    def nombre(self) -> str:
        return self.razon_social

    @property
    def lat(self) -> float:
        return float(self.latitud)

    @property
    def lon(self) -> float:
        return float(self.longitud)


class ReglaCliente(Base):
    __tablename__ = "reglas_cliente"
    __table_args__ = table_args()

    id_regla = pk_column("id_regla")
    id_cliente = Column(BigInteger, ForeignKey(fk_target("clientes.id_cliente")), nullable=False)
    tipo_regla = Column(String(30), nullable=False) # DIA_NO_DISPONIBLE, VENTANA_HORARIA, PREFERENCIA, PRIORIDAD, OTRA
    dia_semana = Column(SmallInteger, nullable=True)
    hora_inicio = Column(Time, nullable=True)
    hora_fin = Column(Time, nullable=True)
    valor = Column(String(255), nullable=True)
    es_restriccion_dura = Column(Boolean, default=True, nullable=False)
    activa = Column(Boolean, default=True, nullable=False)
    observacion = Column(String(500), nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), default=ahora, nullable=False)
    fecha_actualizacion = Column(DateTime(timezone=True), default=ahora, nullable=False)

    cliente_rel = relationship("Cliente", back_populates="reglas")

    @property
    def id(self) -> str:
        return str(self.id_regla)


ReglaAtencion = ReglaCliente  # Alias compatible


# ── 4. Pedidos ────────────────────────────────────────────────────
class Pedido(Base):
    __tablename__ = "pedidos"
    __table_args__ = table_args()

    id_pedido = pk_column("id_pedido")
    codigo_externo = Column(String(80), nullable=False, unique=True, index=True)
    id_cliente = Column(BigInteger, ForeignKey(fk_target("clientes.id_cliente")), nullable=False)
    id_vehiculo = Column(BigInteger, ForeignKey(fk_target("vehiculos.id_vehiculo")), nullable=True)
    fecha_pedido = Column(DateTime(timezone=True), default=ahora, nullable=False)
    fecha_programada = Column(Date, nullable=False)
    peso_kg = Column(Numeric(12, 2), default=0, nullable=False)
    volumen_m3 = Column(Numeric(12, 3), default=0, nullable=False)
    importe = Column(Numeric(12, 2), default=0, nullable=False)
    estado = Column(String(25), default="PENDIENTE", nullable=False) # PENDIENTE, PLANIFICADO, EN_RUTA, ENTREGADO, CANCELADO, BLOQUEADO
    habilitado_despacho = Column(Boolean, default=True, nullable=False)
    origen = Column(String(50), default="TOMAPEDIDOS", nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), default=ahora, nullable=False)

    cliente_rel = relationship("Cliente", back_populates="pedidos")
    vehiculo_rel = relationship("Vehiculo", back_populates="pedidos")
    paradas = relationship("ParadaRuta", back_populates="pedido_rel")

    @hybrid_property
    def id(self) -> str:
        return str(self.id_pedido)

    @id.expression
    def id(cls):
        return cls.id_pedido

    @hybrid_property
    def cliente_id(self) -> str:
        return str(self.id_cliente)

    @cliente_id.setter
    def cliente_id(self, val):
        self.id_cliente = int(val) if val is not None else None

    @cliente_id.expression
    def cliente_id(cls):
        return cls.id_cliente

    @hybrid_property
    def vehiculo_id(self) -> Optional[str]:
        return str(self.id_vehiculo) if self.id_vehiculo else None

    @vehiculo_id.setter
    def vehiculo_id(self, val):
        self.id_vehiculo = int(val) if val is not None else None

    @vehiculo_id.expression
    def vehiculo_id(cls):
        return cls.id_vehiculo

    @property
    def importe_total(self) -> float:
        return float(self.importe)

    @importe_total.setter
    def importe_total(self, val):
        self.importe = val

    @hybrid_property
    def fecha_corte(self) -> str:
        return self.fecha_programada.strftime("%d/%m/%Y") if self.fecha_programada else "27/08/2026"

    @fecha_corte.setter
    def fecha_corte(self, val):
        pass

    @fecha_corte.expression
    def fecha_corte(cls):
        return cls.fecha_programada

    @property
    def tiempo_servicio_min(self) -> int:
        return 15

    @tiempo_servicio_min.setter
    def tiempo_servicio_min(self, val):
        pass


# ── 5. Ejecuciones de Optimización y Rutas ─────────────────────────
class EjecucionOptimizacion(Base):
    __tablename__ = "ejecuciones_optimizacion"
    __table_args__ = table_args()

    id_ejecucion = pk_column("id_ejecucion")
    id_vehiculo = Column(BigInteger, ForeignKey(fk_target("vehiculos.id_vehiculo")), nullable=False)
    fecha_planificacion = Column(Date, nullable=False)
    algoritmo = Column(String(40), default="GENETICO", nullable=False)
    modelo = Column(String(40), default="TSPTW", nullable=False)
    tamano_poblacion = Column(Integer, default=50, nullable=False)
    numero_generaciones = Column(Integer, default=100, nullable=False)
    peso_distancia = Column(Numeric(8, 4), default=0.5, nullable=False)
    peso_tiempo = Column(Numeric(8, 4), default=0.5, nullable=False)
    mejor_fitness = Column(Numeric(18, 6), nullable=True)
    estado = Column(String(20), default="INICIADA", nullable=False) # INICIADA, EN_PROCESO, COMPLETADA, INVIABLE, ERROR
    fecha_inicio = Column(DateTime(timezone=True), default=ahora, nullable=False)
    fecha_fin = Column(DateTime(timezone=True), nullable=True)

    rutas = relationship("Ruta", back_populates="ejecucion_rel")

    @property
    def id(self) -> str:
        return str(self.id_ejecucion)


class Ruta(Base):
    __tablename__ = "rutas"
    __table_args__ = table_args()

    id_ruta = pk_column("id_ruta")
    id_vehiculo = Column(BigInteger, ForeignKey(fk_target("vehiculos.id_vehiculo")), nullable=False)
    id_ejecucion = Column(BigInteger, ForeignKey(fk_target("ejecuciones_optimizacion.id_ejecucion")), nullable=True)
    version_id = Column(String(36), ForeignKey(fk_target("planificaciones_versiones.id")), nullable=True)
    fecha_ruta = Column(Date, nullable=False)
    estado = Column(String(20), default="GENERADA", nullable=False) # GENERADA, EN_REVISION, APROBADA, PUBLICADA, EN_EJECUCION, FINALIZADA, CANCELADA, INVIABLE
    distancia_total_km = Column(Numeric(12, 3), default=0, nullable=False)
    tiempo_estimado_min = Column(Integer, default=0, nullable=False)
    fitness = Column(Numeric(18, 6), nullable=True)
    id_usuario_aprobador = Column(BigInteger, ForeignKey(fk_target("usuarios.id_usuario")), nullable=True)
    fecha_aprobacion = Column(DateTime(timezone=True), nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), default=ahora, nullable=False)

    vehiculo_rel = relationship("Vehiculo", back_populates="rutas")
    ejecucion_rel = relationship("EjecucionOptimizacion", back_populates="rutas")
    aprobador_rel = relationship("Usuario")
    paradas = relationship("ParadaRuta", back_populates="ruta_rel", order_by="ParadaRuta.secuencia")

    @hybrid_property
    def id(self) -> str:
        return str(self.id_ruta)

    @id.expression
    def id(cls):
        return cls.id_ruta

    @hybrid_property
    def vehiculo_id(self) -> str:
        return str(self.id_vehiculo)

    @vehiculo_id.setter
    def vehiculo_id(self, val):
        self.id_vehiculo = int(val) if val is not None else None

    @vehiculo_id.expression
    def vehiculo_id(cls):
        return cls.id_vehiculo

    @property
    def salida(self) -> str:
        return "08:00"

    @salida.setter
    def salida(self, val):
        pass

    @property
    def regreso(self) -> str:
        return "16:30"

    @regreso.setter
    def regreso(self, val):
        pass

    @property
    def distancia_km(self) -> float:
        return float(self.distancia_total_km)

    @distancia_km.setter
    def distancia_km(self, val):
        self.distancia_total_km = val

    @property
    def duracion_min(self) -> int:
        return int(self.tiempo_estimado_min)

    @duracion_min.setter
    def duracion_min(self, val):
        self.tiempo_estimado_min = val

    @property
    def peso_kg(self) -> float:
        return sum(float(p.pedido_rel.peso_kg) for p in self.paradas if p.pedido_rel)

    @peso_kg.setter
    def peso_kg(self, val):
        pass

    @property
    def volumen_m3(self) -> float:
        return sum(float(p.pedido_rel.volumen_m3) for p in self.paradas if p.pedido_rel)

    @volumen_m3.setter
    def volumen_m3(self, val):
        pass

    @hybrid_property
    def repartidor_id(self) -> Optional[str]:
        return str(self.id_usuario_aprobador) if self.id_usuario_aprobador else None

    @repartidor_id.setter
    def repartidor_id(self, val):
        self.id_usuario_aprobador = int(val) if val is not None else None

    @repartidor_id.expression
    def repartidor_id(cls):
        return cls.id_usuario_aprobador


class ParadaRuta(Base):
    __tablename__ = "paradas_ruta"
    __table_args__ = table_args()

    id_parada = pk_column("id_parada")
    id_ruta = Column(BigInteger, ForeignKey(fk_target("rutas.id_ruta")), nullable=False)
    id_pedido = Column(BigInteger, ForeignKey(fk_target("pedidos.id_pedido")), nullable=False)
    secuencia = Column(Integer, nullable=False)
    eta_estimada = Column(DateTime(timezone=True), nullable=True)
    distancia_anterior_km = Column(Numeric(12, 3), default=0, nullable=False)
    tiempo_desde_anterior_min = Column(Integer, default=0, nullable=False)
    tiempo_servicio_min = Column(Integer, default=15, nullable=False)
    bloqueada_manual = Column(Boolean, default=False, nullable=False)
    estado = Column(String(20), default="PENDIENTE", nullable=False) # PENDIENTE, CONFIRMADA, EN_CAMINO, ATENDIDA, NO_ATENDIDA, CANCELADA
    hora_llegada_real = Column(DateTime(timezone=True), nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), default=ahora, nullable=False)

    ruta_rel = relationship("Ruta", back_populates="paradas")
    pedido_rel = relationship("Pedido", back_populates="paradas")
    incidencias = relationship("Incidencia", back_populates="parada_rel")

    @hybrid_property
    def id(self) -> str:
        return str(self.id_parada)

    @id.expression
    def id(cls):
        return cls.id_parada

    @hybrid_property
    def ruta_id(self) -> str:
        return str(self.id_ruta)

    @ruta_id.setter
    def ruta_id(self, val):
        self.id_ruta = int(val) if val is not None else None

    @ruta_id.expression
    def ruta_id(cls):
        return cls.id_ruta

    @hybrid_property
    def pedido_id(self) -> str:
        return str(self.id_pedido)

    @pedido_id.setter
    def pedido_id(self, val):
        self.id_pedido = int(val) if val is not None else None

    @pedido_id.expression
    def pedido_id(cls):
        return cls.id_pedido

    @property
    def llegada(self) -> str:
        return self.eta_estimada.strftime("%H:%M") if self.eta_estimada else "09:00"

    @llegada.setter
    def llegada(self, val):
        pass

    @property
    def inicio_atencion(self) -> str:
        return self.llegada

    @inicio_atencion.setter
    def inicio_atencion(self, val):
        pass

    @property
    def salida(self) -> str:
        return self.llegada

    @salida.setter
    def salida(self, val):
        pass

    @property
    def espera_min(self) -> int:
        return 0

    @espera_min.setter
    def espera_min(self, val):
        pass


Parada = ParadaRuta  # Alias compatible


# ── 6. Incidencias ────────────────────────────────────────────────
class Incidencia(Base):
    __tablename__ = "incidencias"
    __table_args__ = table_args()

    id_incidencia = pk_column("id_incidencia")
    id_parada = Column(BigInteger, ForeignKey(fk_target("paradas_ruta.id_parada")), nullable=False)
    tipo = Column(String(35), nullable=False) # CLIENTE_CERRADO, CLIENTE_NO_RECIBE, DIRECCION_INCORRECTA, PEDIDO_RECHAZADO, VEHICULO_RETRASADO, OTRO
    descripcion = Column(String(1000), nullable=False)
    fecha_hora = Column(DateTime(timezone=True), default=ahora, nullable=False)
    estado = Column(String(20), default="ABIERTA", nullable=False) # ABIERTA, EN_REVISION, RESUELTA, CANCELADA

    parada_rel = relationship("ParadaRuta", back_populates="incidencias")

    @hybrid_property
    def id(self) -> str:
        return str(self.id_incidencia)

    @id.expression
    def id(cls):
        return cls.id_incidencia

    @hybrid_property
    def parada_id(self) -> str:
        return str(self.id_parada)

    @parada_id.setter
    def parada_id(self, val):
        self.id_parada = int(val) if val is not None else None

    @parada_id.expression
    def parada_id(cls):
        return cls.id_parada

    @hybrid_property
    def creado_en(self) -> datetime:
        return self.fecha_hora

    @creado_en.setter
    def creado_en(self, val):
        self.fecha_hora = val

    @creado_en.expression
    def creado_en(cls):
        return cls.fecha_hora

    @property
    def ruta_id(self) -> Optional[str]:
        return str(self.parada_rel.id_ruta) if self.parada_rel else None

    @property
    def registrada_por(self) -> Optional[str]:
        return None

    @property
    def atendida_por(self) -> Optional[str]:
        return None

    @property
    def resolucion(self) -> Optional[str]:
        return None



# ── 7. Auditoría Inmutable ─────────────────────────────────────────
class Auditoria(Base):
    __tablename__ = "auditoria"
    __table_args__ = table_args()

    id_auditoria = pk_column("id_auditoria")
    id_usuario = Column(BigInteger, ForeignKey(fk_target("usuarios.id_usuario")), nullable=True)
    entidad = Column(String(50), nullable=False)
    id_entidad = Column(BigInteger, default=0, nullable=False)
    accion = Column(String(30), nullable=False) # CREAR, ACTUALIZAR, ELIMINAR, APROBAR, PUBLICAR, REOPTIMIZAR
    valor_anterior = Column(JSON, nullable=True)
    valor_nuevo = Column(JSON, nullable=True)
    fecha_hora = Column(DateTime(timezone=True), default=ahora, nullable=False)

    usuario_rel = relationship("Usuario")

    @property
    def id(self) -> str:
        return str(self.id_auditoria)

    @hybrid_property
    def usuario_id(self) -> Optional[str]:
        return str(self.id_usuario) if self.id_usuario else None

    @usuario_id.setter
    def usuario_id(self, val):
        self.id_usuario = int(val) if val is not None else None

    @usuario_id.expression
    def usuario_id(cls):
        return cls.id_usuario

    @hybrid_property
    def entidad_id(self) -> Optional[str]:
        return str(self.id_entidad) if self.id_entidad is not None else None

    @entidad_id.setter
    def entidad_id(self, val):
        try:
            self.id_entidad = int(val) if val is not None else 0
        except (ValueError, TypeError):
            self.id_entidad = 0

    @entidad_id.expression
    def entidad_id(cls):
        return cls.id_entidad

    @hybrid_property
    def fecha(self) -> datetime:
        return self.fecha_hora

    @fecha.setter
    def fecha(self, val):
        self.fecha_hora = val

    @fecha.expression
    def fecha(cls):
        return cls.fecha_hora

    @property
    def valores_antes(self):
        return self.valor_anterior

    @valores_antes.setter
    def valores_antes(self, val):
        self.valor_anterior = val

    @property
    def valores_despues(self):
        return self.valor_nuevo

    @valores_despues.setter
    def valores_despues(self, val):
        self.valor_nuevo = val

    @property
    def ip(self):
        return (self.valor_nuevo or {}).get("ip") if isinstance(self.valor_nuevo, dict) else None

    @ip.setter
    def ip(self, val):
        if val:
            if not isinstance(self.valor_nuevo, dict):
                self.valor_nuevo = {}
            self.valor_nuevo["ip"] = val

    @property
    def request_id(self):
        return (self.valor_nuevo or {}).get("request_id") if isinstance(self.valor_nuevo, dict) else None

    @request_id.setter
    def request_id(self, val):
        if val:
            if not isinstance(self.valor_nuevo, dict):
                self.valor_nuevo = {}
            self.valor_nuevo["request_id"] = val



# ── 8. Tablas de soporte operacional (Cobros, Comprobantes, Planificaciones) ──
class EvidenciaEntrega(Base):
    __tablename__ = "evidencias_entrega"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parada_id = Column(BigInteger, ForeignKey(fk_target("paradas_ruta.id_parada")), nullable=False)
    tipo = Column(String(30), nullable=False) # FOTO, FIRMA, DOCUMENTO
    nombre_archivo = Column(String(255), nullable=False)
    tipo_mime = Column(String(100), nullable=False)
    tamanio_bytes = Column(Integer, nullable=False)
    ruta_almacenamiento = Column(String(500), nullable=False)
    subido_en = Column(DateTime(timezone=True), default=ahora, nullable=False)


class Cobro(Base):
    __tablename__ = "cobros"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parada_id = Column(BigInteger, ForeignKey(fk_target("paradas_ruta.id_parada")), nullable=True)
    pedido_id = Column(BigInteger, ForeignKey(fk_target("pedidos.id_pedido")), nullable=True)
    metodo_pago = Column(String(30), nullable=False) # EFECTIVO, TRANSFERENCIA, YAPE, PLIN, CHEQUE
    monto_esperado = Column(Numeric(12, 2), nullable=False)
    monto_cobrado = Column(Numeric(12, 2), nullable=False)
    estado = Column(String(30), default="PENDIENTE", nullable=False) # PENDIENTE, VALIDADO, RECHAZADO
    nota = Column(Text, nullable=True)
    registrado_por = Column(BigInteger, ForeignKey(fk_target("usuarios.id_usuario")), nullable=True)
    validado_por = Column(BigInteger, ForeignKey(fk_target("usuarios.id_usuario")), nullable=True)
    fecha_registro = Column(DateTime(timezone=True), default=ahora, nullable=False)
    fecha_validacion = Column(DateTime(timezone=True), nullable=True)

    comprobantes = relationship("ComprobantePago", back_populates="cobro_rel", cascade="all, delete-orphan")


class ObservacionCobro(Base):
    __tablename__ = "observaciones_cobro"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cobro_id = Column(String(36), ForeignKey(fk_target("cobros.id")), nullable=False)
    usuario_id = Column(BigInteger, ForeignKey(fk_target("usuarios.id_usuario")), nullable=True)
    motivo = Column(String(100), nullable=False)
    detalle = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora, nullable=False)


class AccesoComprobante(Base):
    __tablename__ = "accesos_comprobante"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    comprobante_id = Column(String(36), ForeignKey(fk_target("comprobantes_pago.id")), nullable=False)
    usuario_id = Column(BigInteger, ForeignKey(fk_target("usuarios.id_usuario")), nullable=False)
    ip_origen = Column(String(45), nullable=True)
    fecha_hora = Column(DateTime(timezone=True), default=ahora, nullable=False)



class ComprobantePago(Base):
    __tablename__ = "comprobantes_pago"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cobro_id = Column(String(36), ForeignKey(fk_target("cobros.id")), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    tipo_mime = Column(String(100), nullable=False)
    tamanio_bytes = Column(Integer, nullable=False)
    ruta_almacenamiento = Column(String(500), nullable=False)
    subido_en = Column(DateTime(timezone=True), default=ahora, nullable=False)

    cobro_rel = relationship("Cobro", back_populates="comprobantes")


class ImportacionPedidos(Base):
    __tablename__ = "importaciones_pedidos"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nombre_archivo = Column(String(255), nullable=False)
    filas_totales = Column(Integer, nullable=False)
    filas_validas = Column(Integer, nullable=False)
    filas_con_error = Column(Integer, default=0, nullable=False)
    estado = Column(String(30), default="PROCESADO", nullable=False)
    errores = Column(JSON, nullable=True)
    importado_por = Column(BigInteger, ForeignKey(fk_target("usuarios.id_usuario")), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora, nullable=False)


# Clases envolventes para planificación de escenarios VRP
class Planificacion(Base):
    __tablename__ = "planificaciones"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fecha = Column(String(10), nullable=False) # "27/08/2026"
    version_vigente = Column(Integer, default=1, nullable=False)
    creada_por = Column(String(50), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora, nullable=False)


class PlanificacionVersion(Base):
    __tablename__ = "planificaciones_versiones"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    planificacion_id = Column(String(36), ForeignKey(fk_target("planificaciones.id")), nullable=False)
    numero = Column(Integer, nullable=False)
    estado = Column(String(30), default="BORRADOR", nullable=False) # BORRADOR, CONFIRMADA
    motivo = Column(String(255), nullable=True)
    parametros = Column(JSON, nullable=True)
    resumen = Column(JSON, nullable=True)
    metodo = Column(String(50), default="HIBRIDO", nullable=False)
    creada_por = Column(String(50), nullable=True)
    confirmada_por = Column(String(50), nullable=True)
    confirmada_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=ahora, nullable=False)


class PedidoNoAsignado(Base):
    __tablename__ = "pedidos_no_asignados"
    __table_args__ = table_args()

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    version_id = Column(String(36), ForeignKey(fk_target("planificaciones_versiones.id")), nullable=False)
    pedido_id = Column(BigInteger, ForeignKey(fk_target("pedidos.id_pedido")), nullable=False)
    codigo = Column(String(50), nullable=True)
    motivo = Column(String(255), nullable=True)
