-- SIPRD PostgreSQL Database Schema
-- Extraido fielmente de C:\Users\JAHRET\Downloads\siprd_db.backup

CREATE SCHEMA IF NOT EXISTS siprd;

CREATE TABLE siprd.auditoria (
    id_auditoria bigint NOT NULL,
    id_usuario bigint,
    entidad character varying(50) NOT NULL,
    id_entidad bigint NOT NULL,
    accion character varying(30) NOT NULL,
    valor_anterior jsonb,
    valor_nuevo jsonb,
    fecha_hora timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT auditoria_accion_check CHECK (((accion)::text = ANY ((ARRAY['CREAR'::character varying, 'ACTUALIZAR'::character varying, 'ELIMINAR'::character varying, 'APROBAR'::character varying, 'PUBLICAR'::character varying, 'REOPTIMIZAR'::character varying])::text[])))
);

CREATE TABLE siprd.clientes (
    id_cliente bigint NOT NULL,
    codigo_externo character varying(80) NOT NULL,
    razon_social character varying(200) NOT NULL,
    direccion character varying(300) NOT NULL,
    distrito character varying(100),
    provincia character varying(100),
    latitud numeric(9,6) NOT NULL,
    longitud numeric(9,6) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT clientes_latitud_check CHECK (((latitud >= ('-90'::integer)::numeric) AND (latitud <= (90)::numeric))),
    CONSTRAINT clientes_longitud_check CHECK (((longitud >= ('-180'::integer)::numeric) AND (longitud <= (180)::numeric)))
);

CREATE TABLE siprd.ejecuciones_optimizacion (
    id_ejecucion bigint NOT NULL,
    id_vehiculo bigint NOT NULL,
    fecha_planificacion date NOT NULL,
    algoritmo character varying(40) DEFAULT 'GENETICO'::character varying NOT NULL,
    modelo character varying(40) DEFAULT 'TSPTW'::character varying NOT NULL,
    tamano_poblacion integer NOT NULL,
    numero_generaciones integer NOT NULL,
    peso_distancia numeric(8,4) NOT NULL,
    peso_tiempo numeric(8,4) NOT NULL,
    mejor_fitness numeric(18,6),
    estado character varying(20) DEFAULT 'INICIADA'::character varying NOT NULL,
    fecha_inicio timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_fin timestamp with time zone,
    CONSTRAINT ck_ejecucion_fechas CHECK (((fecha_fin IS NULL) OR (fecha_fin >= fecha_inicio))),
    CONSTRAINT ejecuciones_optimizacion_estado_check CHECK (((estado)::text = ANY ((ARRAY['INICIADA'::character varying, 'EN_PROCESO'::character varying, 'COMPLETADA'::character varying, 'INVIABLE'::character varying, 'ERROR'::character varying])::text[]))),
    CONSTRAINT ejecuciones_optimizacion_mejor_fitness_check CHECK ((mejor_fitness >= (0)::numeric)),
    CONSTRAINT ejecuciones_optimizacion_numero_generaciones_check CHECK ((numero_generaciones > 0)),
    CONSTRAINT ejecuciones_optimizacion_peso_distancia_check CHECK ((peso_distancia >= (0)::numeric)),
    CONSTRAINT ejecuciones_optimizacion_peso_tiempo_check CHECK ((peso_tiempo >= (0)::numeric)),
    CONSTRAINT ejecuciones_optimizacion_tamano_poblacion_check CHECK ((tamano_poblacion > 0))
);

CREATE TABLE siprd.incidencias (
    id_incidencia bigint NOT NULL,
    id_parada bigint NOT NULL,
    tipo character varying(35) NOT NULL,
    descripcion character varying(1000) NOT NULL,
    fecha_hora timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado character varying(20) DEFAULT 'ABIERTA'::character varying NOT NULL,
    CONSTRAINT incidencias_estado_check CHECK (((estado)::text = ANY ((ARRAY['ABIERTA'::character varying, 'EN_REVISION'::character varying, 'RESUELTA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT incidencias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['CLIENTE_CERRADO'::character varying, 'CLIENTE_NO_RECIBE'::character varying, 'DIRECCION_INCORRECTA'::character varying, 'PEDIDO_RECHAZADO'::character varying, 'VEHICULO_RETRASADO'::character varying, 'OTRO'::character varying])::text[])))
);

CREATE TABLE siprd.paradas_ruta (
    id_parada bigint NOT NULL,
    id_ruta bigint NOT NULL,
    id_pedido bigint NOT NULL,
    secuencia integer NOT NULL,
    eta_estimada timestamp with time zone,
    distancia_anterior_km numeric(12,3) DEFAULT 0 NOT NULL,
    tiempo_desde_anterior_min integer DEFAULT 0 NOT NULL,
    tiempo_servicio_min integer DEFAULT 0 NOT NULL,
    bloqueada_manual boolean DEFAULT false NOT NULL,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    hora_llegada_real timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT paradas_ruta_distancia_anterior_km_check CHECK ((distancia_anterior_km >= (0)::numeric)),
    CONSTRAINT paradas_ruta_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'CONFIRMADA'::character varying, 'EN_CAMINO'::character varying, 'ATENDIDA'::character varying, 'NO_ATENDIDA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT paradas_ruta_secuencia_check CHECK ((secuencia > 0)),
    CONSTRAINT paradas_ruta_tiempo_desde_anterior_min_check CHECK ((tiempo_desde_anterior_min >= 0)),
    CONSTRAINT paradas_ruta_tiempo_servicio_min_check CHECK ((tiempo_servicio_min >= 0))
);

CREATE TABLE siprd.pedidos (
    id_pedido bigint NOT NULL,
    codigo_externo character varying(80) NOT NULL,
    id_cliente bigint NOT NULL,
    id_vehiculo bigint,
    fecha_pedido timestamp with time zone NOT NULL,
    fecha_programada date NOT NULL,
    peso_kg numeric(12,2) DEFAULT 0 NOT NULL,
    volumen_m3 numeric(12,3) DEFAULT 0 NOT NULL,
    importe numeric(12,2) DEFAULT 0 NOT NULL,
    estado character varying(25) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    habilitado_despacho boolean DEFAULT true NOT NULL,
    origen character varying(50) DEFAULT 'TOMAPEDIDOS'::character varying NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pedidos_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'PLANIFICADO'::character varying, 'EN_RUTA'::character varying, 'ENTREGADO'::character varying, 'CANCELADO'::character varying, 'BLOQUEADO'::character varying])::text[]))),
    CONSTRAINT pedidos_importe_check CHECK ((importe >= (0)::numeric)),
    CONSTRAINT pedidos_peso_kg_check CHECK ((peso_kg >= (0)::numeric)),
    CONSTRAINT pedidos_volumen_m3_check CHECK ((volumen_m3 >= (0)::numeric))
);

CREATE TABLE siprd.reglas_cliente (
    id_regla bigint NOT NULL,
    id_cliente bigint NOT NULL,
    tipo_regla character varying(30) NOT NULL,
    dia_semana smallint,
    hora_inicio time without time zone,
    hora_fin time without time zone,
    valor character varying(255),
    es_restriccion_dura boolean DEFAULT true NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    observacion character varying(500),
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_regla_dia CHECK ((((tipo_regla)::text <> 'DIA_NO_DISPONIBLE'::text) OR (dia_semana IS NOT NULL))),
    CONSTRAINT ck_regla_ventana CHECK ((((tipo_regla)::text <> 'VENTANA_HORARIA'::text) OR ((hora_inicio IS NOT NULL) AND (hora_fin IS NOT NULL) AND (hora_inicio < hora_fin)))),
    CONSTRAINT reglas_cliente_dia_semana_check CHECK (((dia_semana >= 1) AND (dia_semana <= 7))),
    CONSTRAINT reglas_cliente_tipo_regla_check CHECK (((tipo_regla)::text = ANY ((ARRAY['DIA_NO_DISPONIBLE'::character varying, 'VENTANA_HORARIA'::character varying, 'PREFERENCIA'::character varying, 'PRIORIDAD'::character varying, 'OTRA'::character varying])::text[])))
);

CREATE TABLE siprd.roles (
    id_rol bigint NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255)
);

CREATE TABLE siprd.rutas (
    id_ruta bigint NOT NULL,
    id_vehiculo bigint NOT NULL,
    id_ejecucion bigint,
    fecha_ruta date NOT NULL,
    estado character varying(20) DEFAULT 'GENERADA'::character varying NOT NULL,
    distancia_total_km numeric(12,3) DEFAULT 0 NOT NULL,
    tiempo_estimado_min integer DEFAULT 0 NOT NULL,
    fitness numeric(18,6),
    id_usuario_aprobador bigint,
    fecha_aprobacion timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ruta_aprobacion CHECK ((((estado)::text <> ALL ((ARRAY['APROBADA'::character varying, 'PUBLICADA'::character varying, 'EN_EJECUCION'::character varying, 'FINALIZADA'::character varying])::text[])) OR ((id_usuario_aprobador IS NOT NULL) AND (fecha_aprobacion IS NOT NULL)))),
    CONSTRAINT rutas_distancia_total_km_check CHECK ((distancia_total_km >= (0)::numeric)),
    CONSTRAINT rutas_estado_check CHECK (((estado)::text = ANY ((ARRAY['GENERADA'::character varying, 'EN_REVISION'::character varying, 'APROBADA'::character varying, 'PUBLICADA'::character varying, 'EN_EJECUCION'::character varying, 'FINALIZADA'::character varying, 'CANCELADA'::character varying, 'INVIABLE'::character varying])::text[]))),
    CONSTRAINT rutas_fitness_check CHECK ((fitness >= (0)::numeric)),
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
    estado character varying(20) DEFAULT 'DISPONIBLE'::character varying NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT vehiculos_capacidad_kg_check CHECK ((capacidad_kg >= (0)::numeric)),
    CONSTRAINT vehiculos_capacidad_m3_check CHECK ((capacidad_m3 >= (0)::numeric)),
    CONSTRAINT vehiculos_estado_check CHECK (((estado)::text = ANY ((ARRAY['DISPONIBLE'::character varying, 'ASIGNADO'::character varying, 'MANTENIMIENTO'::character varying, 'INACTIVO'::character varying])::text[])))
);

-- Primary Keys
ALTER TABLE ONLY siprd.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id_auditoria);
ALTER TABLE ONLY siprd.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente);
ALTER TABLE ONLY siprd.ejecuciones_optimizacion
    ADD CONSTRAINT ejecuciones_optimizacion_pkey PRIMARY KEY (id_ejecucion);
ALTER TABLE ONLY siprd.incidencias
    ADD CONSTRAINT incidencias_pkey PRIMARY KEY (id_incidencia);
ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT paradas_ruta_pkey PRIMARY KEY (id_parada);
ALTER TABLE ONLY siprd.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id_pedido);
ALTER TABLE ONLY siprd.reglas_cliente
    ADD CONSTRAINT reglas_cliente_pkey PRIMARY KEY (id_regla);
ALTER TABLE ONLY siprd.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);
ALTER TABLE ONLY siprd.rutas
    ADD CONSTRAINT rutas_pkey PRIMARY KEY (id_ruta);
ALTER TABLE ONLY siprd.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);
ALTER TABLE ONLY siprd.vehiculos
    ADD CONSTRAINT vehiculos_pkey PRIMARY KEY (id_vehiculo);

-- Unique Constraints
ALTER TABLE ONLY siprd.clientes
    ADD CONSTRAINT clientes_codigo_externo_key UNIQUE (codigo_externo);
ALTER TABLE ONLY siprd.pedidos
    ADD CONSTRAINT pedidos_codigo_externo_key UNIQUE (codigo_externo);
ALTER TABLE ONLY siprd.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);
ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT uq_parada_pedido UNIQUE (id_ruta, id_pedido);
ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT uq_parada_secuencia UNIQUE (id_ruta, secuencia);
ALTER TABLE ONLY siprd.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);
ALTER TABLE ONLY siprd.vehiculos
    ADD CONSTRAINT vehiculos_codigo_externo_key UNIQUE (codigo_externo);
ALTER TABLE ONLY siprd.vehiculos
    ADD CONSTRAINT vehiculos_placa_key UNIQUE (placa);

-- Indexes
CREATE INDEX ix_auditoria_entidad ON siprd.auditoria USING btree (entidad, id_entidad, fecha_hora);
CREATE INDEX ix_incidencias_parada_estado ON siprd.incidencias USING btree (id_parada, estado);
CREATE INDEX ix_paradas_ruta_secuencia ON siprd.paradas_ruta USING btree (id_ruta, secuencia);
CREATE INDEX ix_pedidos_cliente ON siprd.pedidos USING btree (id_cliente);
CREATE INDEX ix_pedidos_planificacion ON siprd.pedidos USING btree (fecha_programada, habilitado_despacho, estado);
CREATE INDEX ix_reglas_cliente_activas ON siprd.reglas_cliente USING btree (id_cliente, activa);
CREATE INDEX ix_rutas_fecha_estado ON siprd.rutas USING btree (fecha_ruta, estado);
CREATE INDEX ix_rutas_vehiculo ON siprd.rutas USING btree (id_vehiculo, fecha_ruta);

-- Foreign Keys
ALTER TABLE ONLY siprd.auditoria
    ADD CONSTRAINT auditoria_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES siprd.usuarios(id_usuario);
ALTER TABLE ONLY siprd.ejecuciones_optimizacion
    ADD CONSTRAINT ejecuciones_optimizacion_id_vehiculo_fkey FOREIGN KEY (id_vehiculo) REFERENCES siprd.vehiculos(id_vehiculo);
ALTER TABLE ONLY siprd.incidencias
    ADD CONSTRAINT incidencias_id_parada_fkey FOREIGN KEY (id_parada) REFERENCES siprd.paradas_ruta(id_parada);
ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT paradas_ruta_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES siprd.pedidos(id_pedido);
ALTER TABLE ONLY siprd.paradas_ruta
    ADD CONSTRAINT paradas_ruta_id_ruta_fkey FOREIGN KEY (id_ruta) REFERENCES siprd.rutas(id_ruta);
ALTER TABLE ONLY siprd.pedidos
    ADD CONSTRAINT pedidos_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES siprd.clientes(id_cliente);
ALTER TABLE ONLY siprd.pedidos
    ADD CONSTRAINT pedidos_id_vehiculo_fkey FOREIGN KEY (id_vehiculo) REFERENCES siprd.vehiculos(id_vehiculo);
ALTER TABLE ONLY siprd.reglas_cliente
    ADD CONSTRAINT reglas_cliente_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES siprd.clientes(id_cliente);
ALTER TABLE ONLY siprd.rutas
    ADD CONSTRAINT rutas_id_ejecucion_fkey FOREIGN KEY (id_ejecucion) REFERENCES siprd.ejecuciones_optimizacion(id_ejecucion);
ALTER TABLE ONLY siprd.rutas
    ADD CONSTRAINT rutas_id_usuario_aprobador_fkey FOREIGN KEY (id_usuario_aprobador) REFERENCES siprd.usuarios(id_usuario);
ALTER TABLE ONLY siprd.rutas
    ADD CONSTRAINT rutas_id_vehiculo_fkey FOREIGN KEY (id_vehiculo) REFERENCES siprd.vehiculos(id_vehiculo);
ALTER TABLE ONLY siprd.usuarios
    ADD CONSTRAINT usuarios_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES siprd.roles(id_rol);

-- Soporte operacional y vinculación de versión para planificación de rutas VRP
ALTER TABLE siprd.rutas ADD COLUMN IF NOT EXISTS version_id character varying(36);


