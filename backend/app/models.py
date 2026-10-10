"""Modelos ORM alineados al esquema físico SIPRD de 13 tablas."""
from datetime import datetime
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, SmallInteger, String, Text, Time
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.db import Base
from backend.app.core.tiempo import ahora

SCHEMA = "siprd"

def fk(table_column: str) -> str:
    return f"{SCHEMA}.{table_column}"

class Rol(Base):
    __tablename__ = "roles"; __table_args__ = {"schema": SCHEMA}
    id_rol: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    usuarios = relationship("Usuario", back_populates="rol_rel")

class Usuario(Base):
    __tablename__ = "usuarios"; __table_args__ = {"schema": SCHEMA}
    id_usuario: Mapped[int] = mapped_column(primary_key=True)
    id_rol: Mapped[int] = mapped_column(ForeignKey(fk("roles.id_rol")))
    nombres: Mapped[str] = mapped_column(String(100))
    apellidos: Mapped[str] = mapped_column(String(100))
    correo: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    rol_rel = relationship("Rol", back_populates="usuarios", lazy="joined")
    @property
    def id(self): return self.id_usuario
    @property
    def nombre(self): return self.nombres
    @property
    def usuario(self): return self.correo.split("@", 1)[0]
    @property
    def rol(self): return self.rol_rel.nombre.upper() if self.rol_rel else ""
    @property
    def ultimo_acceso(self): return None

class Cliente(Base):
    __tablename__ = "clientes"; __table_args__ = {"schema": SCHEMA}
    id_cliente: Mapped[int] = mapped_column(primary_key=True)
    codigo_externo: Mapped[str] = mapped_column(String(80), unique=True)
    razon_social: Mapped[str] = mapped_column(String(200))
    direccion: Mapped[str] = mapped_column(String(300))
    distrito: Mapped[str | None] = mapped_column(String(100))
    provincia: Mapped[str | None] = mapped_column(String(100))
    latitud: Mapped[float | None] = mapped_column(Numeric(9, 6))
    longitud: Mapped[float | None] = mapped_column(Numeric(9, 6))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    restricciones = relationship("RestriccionCliente", back_populates="cliente")
    @property
    def id(self): return self.id_cliente
    @property
    def nombre(self): return self.razon_social
    @property
    def lat(self): return self.latitud
    @property
    def lon(self): return self.longitud

class RestriccionCliente(Base):
    __tablename__ = "restricciones_cliente"; __table_args__ = {"schema": SCHEMA}
    id_restriccion: Mapped[int] = mapped_column(primary_key=True)
    id_cliente: Mapped[int] = mapped_column(ForeignKey(fk("clientes.id_cliente")))
    tipo_restriccion: Mapped[str] = mapped_column(String(25))
    dia_semana: Mapped[int | None] = mapped_column(SmallInteger)
    fecha_especifica: Mapped[datetime | None] = mapped_column(Date)
    hora_inicio: Mapped[datetime | None] = mapped_column(Time)
    hora_fin: Mapped[datetime | None] = mapped_column(Time)
    observacion: Mapped[str | None] = mapped_column(String(500))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    fecha_actualizacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora, onupdate=ahora)
    cliente = relationship("Cliente", back_populates="restricciones")
    @property
    def id(self): return self.id_restriccion

class Vehiculo(Base):
    __tablename__ = "vehiculos"; __table_args__ = {"schema": SCHEMA}
    id_vehiculo: Mapped[int] = mapped_column(primary_key=True)
    codigo_externo: Mapped[str] = mapped_column(String(80), unique=True)
    placa: Mapped[str] = mapped_column(String(20), unique=True)
    marca: Mapped[str | None] = mapped_column(String(80))
    modelo: Mapped[str | None] = mapped_column(String(80))
    capacidad_kg: Mapped[float] = mapped_column(Numeric(12, 2))
    capacidad_m3: Mapped[float] = mapped_column(Numeric(12, 3))
    estado_operativo: Mapped[str] = mapped_column(String(20), default="DISPONIBLE")
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    @property
    def id(self): return self.id_vehiculo
    @property
    def capacidad_peso_kg(self): return self.capacidad_kg
    @property
    def capacidad_volumen_m3(self): return self.capacidad_m3

class Pedido(Base):
    __tablename__ = "pedidos"; __table_args__ = {"schema": SCHEMA}
    id_pedido: Mapped[int] = mapped_column(primary_key=True)
    codigo_externo: Mapped[str] = mapped_column(String(80), unique=True)
    id_cliente: Mapped[int] = mapped_column(ForeignKey(fk("clientes.id_cliente")))
    fecha_pedido: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fecha_programada: Mapped[datetime] = mapped_column(Date)
    peso_kg: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    volumen_m3: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    importe_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    estado: Mapped[str] = mapped_column(String(20), default="PENDIENTE")
    habilitado_despacho: Mapped[bool] = mapped_column(Boolean, default=True)
    origen: Mapped[str] = mapped_column(String(50), default="BASE_CORPORATIVA")
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    cliente = relationship("Cliente")
    @property
    def id(self): return self.id_pedido
    @property
    def importe(self): return self.importe_total

class Planificacion(Base):
    __tablename__ = "planificaciones"; __table_args__ = {"schema": SCHEMA}
    id_planificacion: Mapped[int] = mapped_column(primary_key=True)
    id_planificacion_anterior: Mapped[int | None] = mapped_column(ForeignKey(fk("planificaciones.id_planificacion")))
    fecha_operacion: Mapped[datetime] = mapped_column(Date)
    numero_version: Mapped[int] = mapped_column(Integer, default=1)
    algoritmo: Mapped[str] = mapped_column(String(50), default="GENETICO")
    estado: Mapped[str] = mapped_column(String(20), default="GENERADA")
    id_usuario_creador: Mapped[int] = mapped_column(ForeignKey(fk("usuarios.id_usuario")))
    id_usuario_confirmador: Mapped[int | None] = mapped_column(ForeignKey(fk("usuarios.id_usuario")))
    fecha_confirmacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    rutas = relationship("Ruta", back_populates="planificacion")
    @property
    def id(self): return self.id_planificacion

class Ruta(Base):
    __tablename__ = "rutas"; __table_args__ = {"schema": SCHEMA}
    id_ruta: Mapped[int] = mapped_column(primary_key=True)
    id_planificacion: Mapped[int] = mapped_column(ForeignKey(fk("planificaciones.id_planificacion")))
    id_vehiculo: Mapped[int] = mapped_column(ForeignKey(fk("vehiculos.id_vehiculo")))
    estado: Mapped[str] = mapped_column(String(20), default="GENERADA")
    distancia_total_km: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    tiempo_estimado_min: Mapped[int] = mapped_column(Integer, default=0)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    planificacion = relationship("Planificacion", back_populates="rutas")
    vehiculo = relationship("Vehiculo")
    paradas = relationship("ParadaRuta", back_populates="ruta")
    @property
    def id(self): return self.id_ruta

class ParadaRuta(Base):
    __tablename__ = "paradas_ruta"; __table_args__ = {"schema": SCHEMA}
    id_parada: Mapped[int] = mapped_column(primary_key=True)
    id_ruta: Mapped[int] = mapped_column(ForeignKey(fk("rutas.id_ruta")))
    id_pedido: Mapped[int] = mapped_column(ForeignKey(fk("pedidos.id_pedido")))
    secuencia: Mapped[int] = mapped_column(Integer)
    eta_estimada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hora_llegada_real: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    distancia_anterior_km: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    tiempo_servicio_min: Mapped[int] = mapped_column(Integer, default=0)
    bloqueada_manual: Mapped[bool] = mapped_column(Boolean, default=False)
    estado: Mapped[str] = mapped_column(String(20), default="PENDIENTE")
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    ruta = relationship("Ruta", back_populates="paradas")
    pedido = relationship("Pedido")
    @property
    def id(self): return self.id_parada

class Incidencia(Base):
    __tablename__ = "incidencias"; __table_args__ = {"schema": SCHEMA}
    id_incidencia: Mapped[int] = mapped_column(primary_key=True)
    id_parada: Mapped[int] = mapped_column(ForeignKey(fk("paradas_ruta.id_parada")))
    tipo: Mapped[str] = mapped_column(String(35))
    descripcion: Mapped[str] = mapped_column(String(1000))
    estado: Mapped[str] = mapped_column(String(20), default="ABIERTA")
    id_usuario_registro: Mapped[int] = mapped_column(ForeignKey(fk("usuarios.id_usuario")))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    @property
    def id(self): return self.id_incidencia

class Cobro(Base):
    __tablename__ = "cobros"; __table_args__ = {"schema": SCHEMA}
    id_cobro: Mapped[int] = mapped_column(primary_key=True)
    id_parada: Mapped[int] = mapped_column(ForeignKey(fk("paradas_ruta.id_parada")))
    medio_pago: Mapped[str] = mapped_column(String(20))
    monto: Mapped[float] = mapped_column(Numeric(12, 2))
    numero_operacion: Mapped[str | None] = mapped_column(String(100))
    url_comprobante: Mapped[str | None] = mapped_column(Text)
    nombre_archivo: Mapped[str | None] = mapped_column(String(255))
    tipo_mime: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str] = mapped_column(String(20), default="PENDIENTE")
    observacion: Mapped[str | None] = mapped_column(String(1000))
    id_usuario_registro: Mapped[int] = mapped_column(ForeignKey(fk("usuarios.id_usuario")))
    id_usuario_validador: Mapped[int | None] = mapped_column(ForeignKey(fk("usuarios.id_usuario")))
    fecha_registro: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    fecha_validacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    parada = relationship("ParadaRuta")
    @property
    def id(self): return self.id_cobro

class EvidenciaEntrega(Base):
    __tablename__ = "evidencias_entrega"; __table_args__ = {"schema": SCHEMA}
    id_evidencia: Mapped[int] = mapped_column(primary_key=True)
    id_parada: Mapped[int] = mapped_column(ForeignKey(fk("paradas_ruta.id_parada")))
    url_archivo: Mapped[str] = mapped_column(Text)
    nombre_archivo: Mapped[str] = mapped_column(String(255))
    tipo_mime: Mapped[str] = mapped_column(String(100))
    descripcion: Mapped[str | None] = mapped_column(String(500))
    id_usuario_registro: Mapped[int] = mapped_column(ForeignKey(fk("usuarios.id_usuario")))
    fecha_registro: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    @property
    def id(self): return self.id_evidencia

class Auditoria(Base):
    __tablename__ = "auditoria"; __table_args__ = {"schema": SCHEMA}
    id_auditoria: Mapped[int] = mapped_column(primary_key=True)
    id_usuario: Mapped[int | None] = mapped_column(ForeignKey(fk("usuarios.id_usuario")))
    entidad: Mapped[str] = mapped_column(String(50))
    id_entidad: Mapped[int] = mapped_column()
    accion: Mapped[str] = mapped_column(String(30))
    valor_anterior: Mapped[dict | None] = mapped_column(JSONB)
    valor_nuevo: Mapped[dict | None] = mapped_column(JSONB)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    @property
    def id(self): return self.id_auditoria

# Alias mínimos para nombres internos de la aplicación.
ReglaCliente = RestriccionCliente
ReglaAtencion = RestriccionCliente
Parada = ParadaRuta
