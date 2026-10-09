-- ============================================================================
-- SIPRD PostgreSQL Database Schema — Version de Grupo
-- Extraido fielmente de C:\Users\JAHRET\Downloads\siprd_grupo.backup (09/10/2026)
-- Esquema formal: siprd (13 tablas, normalizado 3FN / FNBC)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS siprd;
COMMENT ON SCHEMA siprd IS 'Esquema del Sistema Inteligente de Planificacion y Reparto de Distribuidores';

CREATE TABLE siprd.auditoria (
    id_auditoria bigint NOT NULL,
    id_usuario bigint,
    entidad character varying(50) NOT NULL,
    id_entidad bigint NOT NULL,
    accion character varying(30) NOT NULL,
    valor_anterior jsonb,
    valor_nuevo jsonb,
    fecha_hora timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT auditoria_accion_check CHECK (((accion)::text = ANY ((ARRAY['CREAR'::character varying, 'ACTUALIZAR'::character varying, 'DESACTIVAR'::character varying, 'CONFIRMAR'::character varying, 'REPLANIFICAR'::character varying, 'VALIDAR'::character varying, 'OBSERVAR'::character varying])::text[])))
);

CREATE TABLE siprd.clientes (
    id_cliente bigint NOT NULL,
    codigo_externo character varying(80) NOT NULL,
    razon_social character varying(200) NOT NULL,
    direccion character varying(300) NOT NULL,
    distrito character varying(100),
    provincia character varying(100),
    latitud numeric(9,6),
    longitud numeric(9,6),
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cliente_latitud CHECK (((latitud IS NULL) OR ((latitud >= ('-90'::integer)::numeric) AND (latitud <= (90)::numeric)))),
    CONSTRAINT ck_cliente_longitud CHECK (((longitud IS NULL) OR ((longitud >= ('-180'::integer)::numeric) AND (longitud <= (180)::numeric))))
);

CREATE TABLE siprd.cobros (
    id_cobro bigint NOT NULL,
    id_parada bigint NOT NULL,
    medio_pago character varying(20) NOT NULL,
    monto numeric(12,2) NOT NULL,
    numero_operacion character varying(100),
    url_comprobante text,
    nombre_archivo character varying(255),
    tipo_mime character varying(100),
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    observacion character varying(1000),
    id_usuario_registro bigint NOT NULL,
    id_usuario_validador bigint,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_validacion timestamp with time zone,
    CONSTRAINT ck_cobro_archivo CHECK ((((url_comprobante IS NULL) AND (nombre_archivo IS NULL) AND (tipo_mime IS NULL)) OR ((url_comprobante IS NOT NULL) AND (nombre_archivo IS NOT NULL) AND (tipo_mime IS NOT NULL)))),
    CONSTRAINT ck_cobro_observacion CHECK ((((estado)::text <> 'OBSERVADO'::text) OR (observacion IS NOT NULL))),
    CONSTRAINT ck_cobro_validacion CHECK ((((estado)::text = 'PENDIENTE'::text) OR ((id_usuario_validador IS NOT NULL) AND (fecha_validacion IS NOT NULL)))),
    CONSTRAINT cobros_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'CONFORME'::character varying, 'OBSERVADO'::character varying])::text[]))),
    CONSTRAINT cobros_medio_pago_check CHECK (((medio_pago)::text = ANY ((ARRAY['EFECTIVO'::character varying, 'YAPE'::character varying, 'PLIN'::character varying, 'TRANSFERENCIA'::character varying, 'DEPOSITO'::character varying])::text[]))),
    CONSTRAINT cobros_monto_check CHECK ((monto > (0)::numeric))
);

CREATE TABLE siprd.evidencias_entrega (
    id_evidencia bigint NOT NULL,
    id_parada bigint NOT NULL,
    url_archivo text NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    tipo_mime character varying(100) NOT NULL,
    descripcion character varying(500),
    id_usuario_registro bigint NOT NULL,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE siprd.incidencias (
    id_incidencia bigint NOT NULL,
    id_parada bigint NOT NULL,
    tipo character varying(35) NOT NULL,
    descripcion character varying(1000) NOT NULL,
    estado character varying(20) DEFAULT 'ABIERTA'::character varying NOT NULL,
    id_usuario_registro bigint NOT NULL,
    fecha_hora timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT incidencias_estado_check CHECK (((estado)::text = ANY ((ARRAY['ABIERTA'::character varying, 'EN_REVISION'::character varying, 'RESUELTA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT incidencias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['CLIENTE_CERRADO'::character varying, 'CLIENTE_NO_RECIBE'::character varying, 'DIRECCION_INCORRECTA'::character varying, 'PEDIDO_RECHAZADO'::character varying, 'VEHICULO_RETRASADO'::character varying, 'OTRO'::character varying])::text[])))
);

CREATE TABLE siprd.paradas_ruta (
    id_parada bigint NOT NULL,
    id_ruta bigint NOT NULL,
    id_pedido bigint NOT NULL,
    secuencia integer NOT NULL,
    eta_estimada timestamp with time zone,
    hora_llegada_real timestamp with time zone,
    distancia_anterior_km numeric(12,3) DEFAULT 0 NOT NULL,
    tiempo_servicio_min integer DEFAULT 0 NOT NULL,
    bloqueada_manual boolean DEFAULT false NOT NULL,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT paradas_ruta_distancia_anterior_km_check CHECK ((distancia_anterior_km >= (0)::numeric)),
    CONSTRAINT paradas_ruta_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'EN_CAMINO'::character varying, 'ATENDIDA'::character varying, 'NO_ATENDIDA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT paradas_ruta_secuencia_check CHECK ((secuencia > 0)),
    CONSTRAINT paradas_ruta_tiempo_servicio_min_check CHECK ((tiempo_servicio_min >= 0))
);

CREATE TABLE siprd.pedidos (
    id_pedido bigint NOT NULL,
    codigo_externo character varying(80) NOT NULL,
    id_cliente bigint NOT NULL,
    fecha_pedido timestamp with time zone NOT NULL,
    fecha_programada date NOT NULL,
    peso_kg numeric(12,2) DEFAULT 0 NOT NULL,
    volumen_m3 numeric(12,3) DEFAULT 0 NOT NULL,
    importe_total numeric(12,2) DEFAULT 0 NOT NULL,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    habilitado_despacho boolean DEFAULT true NOT NULL,
    origen character varying(50) DEFAULT 'BASE_CORPORATIVA'::character varying NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pedidos_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'PLANIFICADO'::character varying, 'EN_RUTA'::character varying, 'ENTREGADO'::character varying, 'CANCELADO'::character varying])::text[]))),
    CONSTRAINT pedidos_importe_total_check CHECK ((importe_total >= (0)::numeric)),
    CONSTRAINT pedidos_peso_kg_check CHECK ((peso_kg >= (0)::numeric)),
    CONSTRAINT pedidos_volumen_m3_check CHECK ((volumen_m3 >= (0)::numeric))
);

CREATE TABLE siprd.planificaciones (
    id_planificacion bigint NOT NULL,
    id_planificacion_anterior bigint,
    fecha_operacion date NOT NULL,
    numero_version integer DEFAULT 1 NOT NULL,
    algoritmo character varying(50) DEFAULT 'GENETICO'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'GENERADA'::character varying NOT NULL,
    id_usuario_creador bigint NOT NULL,
    id_usuario_confirmador bigint,
    fecha_confirmacion timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_planificacion_confirmacion CHECK ((((estado)::text <> 'CONFIRMADA'::text) OR ((id_usuario_confirmador IS NOT NULL) AND (fecha_confirmacion IS NOT NULL)))),
    CONSTRAINT planificaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['GENERADA'::character varying, 'EN_REVISION'::character varying, 'CONFIRMADA'::character varying, 'REPLANIFICADA'::character varying, 'CANCELADA'::character varying, 'INVIABLE'::character varying])::text[]))),
    CONSTRAINT planificaciones_numero_version_check CHECK ((numero_version > 0))
);

CREATE TABLE siprd.restricciones_cliente (
    id_restriccion bigint NOT NULL,
    id_cliente bigint NOT NULL,
    tipo_restriccion character varying(25) NOT NULL,
    dia_semana smallint,
    fecha_especifica date,
    hora_inicio time without time zone,
    hora_fin time without time zone,
    observacion character varying(500),
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_restriccion_dia_o_fecha CHECK (((dia_semana IS NOT NULL) OR (fecha_especifica IS NOT NULL))),
    CONSTRAINT ck_restriccion_horario CHECK ((((hora_inicio IS NULL) AND (hora_fin IS NULL)) OR ((hora_inicio IS NOT NULL) AND (hora_fin IS NOT NULL) AND (hora_inicio < hora_fin)))),
    CONSTRAINT restricciones_cliente_dia_semana_check CHECK (((dia_semana >= 1) AND (dia_semana <= 7))),
    CONSTRAINT restricciones_cliente_tipo_restriccion_check CHECK (((tipo_restriccion)::text = ANY ((ARRAY['RECIBE'::character varying, 'NO_RECIBE'::character varying, 'PRIORIDAD'::character varying])::text[])))
);

CREATE TABLE siprd.roles (
    id_rol bigint NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255),
    activo boolean DEFAULT true NOT NULL
);

CREATE TABLE siprd.rutas (
    id_ruta bigint NOT NULL,
    id_planificacion bigint NOT NULL,
    id_vehiculo bigint NOT NULL,
    estado character varying(20) DEFAULT 'GENERADA'::character varying NOT NULL,
    distancia_total_km numeric(12,3) DEFAULT 0 NOT NULL,
    tiempo_estimado_min integer DEFAULT 0 NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT rutas_distancia_total_km_check CHECK ((distancia_total_km >= (0)::numeric)),
    CONSTRAINT rutas_estado_check CHECK (((estado)::text = ANY ((ARRAY['GENERADA'::character varying, 'CONFIRMADA'::character varying, 'EN_EJECUCION'::character varying, 'FINALIZADA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT rutas_tiempo_estimado_min_check CHECK ((tiempo_estimado_min >= 0))
);

CREATE TABLE siprd.usuarios (
    id_usuario bigint NOT NULL,
    id_rol bigint NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    correo character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE siprd.vehiculos (
    id_vehiculo bigint NOT NULL,
    codigo_externo character varying(80) NOT NULL,
    placa character varying(20) NOT NULL,
    marca character varying(80),
    modelo character varying(80),
    capacidad_kg numeric(12,2) NOT NULL,
    capacidad_m3 numeric(12,3) NOT NULL,
    estado_operativo character varying(20) DEFAULT 'DISPONIBLE'::character varying NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT vehiculos_capacidad_kg_check CHECK ((capacidad_kg > (0)::numeric)),
    CONSTRAINT vehiculos_capacidad_m3_check CHECK ((capacidad_m3 > (0)::numeric)),
    CONSTRAINT vehiculos_estado_operativo_check CHECK (((estado_operativo)::text = ANY ((ARRAY['DISPONIBLE'::character varying, 'MANTENIMIENTO'::character varying, 'INACTIVO'::character varying])::text[])))
);

ALTER TABLE ONLY siprd.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id_auditoria);

ALTER TABLE ONLY siprd.clientes
    ADD CONSTRAINT clientes_codigo_externo_key UNIQUE (codigo_externo);

ALTER TABLE ONLY siprd.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente);

ALTER TABLE ONLY siprd.cobros
    ADD CONSTRAINT cobros_pkey PRIMARY KEY (id_cobro);

ALTER TABLE ONLY siprd.evidencias_entrega
    ADD CONSTRAINT evidencias_entrega_pkey PRIMARY KEY (id_evidencia);

ALTER TABLE ONLY siprd.incidencias
    ADD CONSTRAINT incidencias_pkey PRIMARY KEY (id_incidencia);

ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT paradas_ruta_pkey PRIMARY KEY (id_parada);

ALTER TABLE ONLY siprd.pedidos
    ADD CONSTRAINT pedidos_codigo_externo_key UNIQUE (codigo_externo);

ALTER TABLE ONLY siprd.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id_pedido);

ALTER TABLE ONLY siprd.planificaciones
    ADD CONSTRAINT planificaciones_pkey PRIMARY KEY (id_planificacion);

ALTER TABLE ONLY siprd.restricciones_cliente
    ADD CONSTRAINT restricciones_cliente_pkey PRIMARY KEY (id_restriccion);

ALTER TABLE ONLY siprd.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY siprd.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);

ALTER TABLE ONLY siprd.rutas
    ADD CONSTRAINT rutas_pkey PRIMARY KEY (id_ruta);

ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT uq_parada_pedido UNIQUE (id_ruta, id_pedido);

ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT uq_parada_secuencia UNIQUE (id_ruta, secuencia);

ALTER TABLE ONLY siprd.planificaciones
    ADD CONSTRAINT uq_planificacion_version UNIQUE (fecha_operacion, numero_version);

ALTER TABLE ONLY siprd.rutas
    ADD CONSTRAINT uq_ruta_vehiculo_plan UNIQUE (id_planificacion, id_vehiculo);

ALTER TABLE ONLY siprd.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);

ALTER TABLE ONLY siprd.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);

ALTER TABLE ONLY siprd.vehiculos
    ADD CONSTRAINT vehiculos_codigo_externo_key UNIQUE (codigo_externo);

ALTER TABLE ONLY siprd.vehiculos
    ADD CONSTRAINT vehiculos_pkey PRIMARY KEY (id_vehiculo);

ALTER TABLE ONLY siprd.vehiculos
    ADD CONSTRAINT vehiculos_placa_key UNIQUE (placa);

CREATE INDEX ix_auditoria_entidad ON siprd.auditoria USING btree (entidad, id_entidad, fecha_hora);

CREATE INDEX ix_cobros_parada_estado ON siprd.cobros USING btree (id_parada, estado);

CREATE INDEX ix_evidencias_parada ON siprd.evidencias_entrega USING btree (id_parada);

CREATE INDEX ix_incidencias_parada ON siprd.incidencias USING btree (id_parada, estado);

CREATE INDEX ix_paradas_ruta ON siprd.paradas_ruta USING btree (id_ruta, secuencia);

CREATE INDEX ix_pedidos_planificacion ON siprd.pedidos USING btree (fecha_programada, estado, habilitado_despacho);

CREATE INDEX ix_restricciones_cliente ON siprd.restricciones_cliente USING btree (id_cliente, activo);

CREATE INDEX ix_rutas_planificacion ON siprd.rutas USING btree (id_planificacion);

CREATE INDEX ix_usuarios_rol ON siprd.usuarios USING btree (id_rol);

ALTER TABLE ONLY siprd.auditoria
    ADD CONSTRAINT auditoria_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES siprd.usuarios(id_usuario);

ALTER TABLE ONLY siprd.cobros
    ADD CONSTRAINT cobros_id_parada_fkey FOREIGN KEY (id_parada) REFERENCES siprd.paradas_ruta(id_parada);

ALTER TABLE ONLY siprd.cobros
    ADD CONSTRAINT cobros_id_usuario_registro_fkey FOREIGN KEY (id_usuario_registro) REFERENCES siprd.usuarios(id_usuario);

ALTER TABLE ONLY siprd.cobros
    ADD CONSTRAINT cobros_id_usuario_validador_fkey FOREIGN KEY (id_usuario_validador) REFERENCES siprd.usuarios(id_usuario);

ALTER TABLE ONLY siprd.evidencias_entrega
    ADD CONSTRAINT evidencias_entrega_id_parada_fkey FOREIGN KEY (id_parada) REFERENCES siprd.paradas_ruta(id_parada);

ALTER TABLE ONLY siprd.evidencias_entrega
    ADD CONSTRAINT evidencias_entrega_id_usuario_registro_fkey FOREIGN KEY (id_usuario_registro) REFERENCES siprd.usuarios(id_usuario);

ALTER TABLE ONLY siprd.incidencias
    ADD CONSTRAINT incidencias_id_parada_fkey FOREIGN KEY (id_parada) REFERENCES siprd.paradas_ruta(id_parada);

ALTER TABLE ONLY siprd.incidencias
    ADD CONSTRAINT incidencias_id_usuario_registro_fkey FOREIGN KEY (id_usuario_registro) REFERENCES siprd.usuarios(id_usuario);

ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT paradas_ruta_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES siprd.pedidos(id_pedido);

ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT paradas_ruta_id_ruta_fkey FOREIGN KEY (id_ruta) REFERENCES siprd.rutas(id_ruta);

ALTER TABLE ONLY siprd.pedidos
    ADD CONSTRAINT pedidos_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES siprd.clientes(id_cliente);

ALTER TABLE ONLY siprd.planificaciones
    ADD CONSTRAINT planificaciones_id_planificacion_anterior_fkey FOREIGN KEY (id_planificacion_anterior) REFERENCES siprd.planificaciones(id_planificacion);

ALTER TABLE ONLY siprd.planificaciones
    ADD CONSTRAINT planificaciones_id_usuario_confirmador_fkey FOREIGN KEY (id_usuario_confirmador) REFERENCES siprd.usuarios(id_usuario);

ALTER TABLE ONLY siprd.planificaciones
    ADD CONSTRAINT planificaciones_id_usuario_creador_fkey FOREIGN KEY (id_usuario_creador) REFERENCES siprd.usuarios(id_usuario);

ALTER TABLE ONLY siprd.restricciones_cliente
    ADD CONSTRAINT restricciones_cliente_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES siprd.clientes(id_cliente);

ALTER TABLE ONLY siprd.rutas
    ADD CONSTRAINT rutas_id_planificacion_fkey FOREIGN KEY (id_planificacion) REFERENCES siprd.planificaciones(id_planificacion);

ALTER TABLE ONLY siprd.rutas
    ADD CONSTRAINT rutas_id_vehiculo_fkey FOREIGN KEY (id_vehiculo) REFERENCES siprd.vehiculos(id_vehiculo);

ALTER TABLE ONLY siprd.usuarios
    ADD CONSTRAINT usuarios_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES siprd.roles(id_rol);

