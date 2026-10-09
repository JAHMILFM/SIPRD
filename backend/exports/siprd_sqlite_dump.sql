-- SIPRD · SQLite Database Dump
-- Fecha: 2026-10-09T13:58:45.449313

BEGIN TRANSACTION;
CREATE TABLE accesos_comprobante (
	id VARCHAR(36) NOT NULL, 
	comprobante_id VARCHAR(36) NOT NULL, 
	usuario_id BIGINT NOT NULL, 
	ip_origen VARCHAR(45), 
	fecha_hora DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(comprobante_id) REFERENCES comprobantes_pago (id), 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id_usuario)
);
CREATE TABLE auditoria (
	id_auditoria INTEGER NOT NULL, 
	id_usuario BIGINT, 
	entidad VARCHAR(50) NOT NULL, 
	id_entidad BIGINT NOT NULL, 
	accion VARCHAR(30) NOT NULL, 
	valor_anterior JSON, 
	valor_nuevo JSON, 
	fecha_hora DATETIME NOT NULL, 
	PRIMARY KEY (id_auditoria), 
	FOREIGN KEY(id_usuario) REFERENCES usuarios (id_usuario)
);
INSERT INTO "auditoria" VALUES(1,1,'sistema',1,'CREAR','null','{"descripcion": "Base de datos inicializada y alineada con siprd_db.backup"}','2026-10-09 08:43:36.889871');
INSERT INTO "auditoria" VALUES(2,1,'usuario',1,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 09:03:19.556099');
INSERT INTO "auditoria" VALUES(3,1,'usuario',1,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 09:03:27.487788');
INSERT INTO "auditoria" VALUES(4,1,'usuario',1,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 09:05:16.019848');
INSERT INTO "auditoria" VALUES(5,1,'usuario',1,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 09:11:07.119569');
INSERT INTO "auditoria" VALUES(6,1,'usuario',1,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 09:11:16.235424');
INSERT INTO "auditoria" VALUES(7,1,'usuario',1,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 09:13:05.747536');
INSERT INTO "auditoria" VALUES(8,1,'usuario',1,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 13:43:06.198786');
INSERT INTO "auditoria" VALUES(9,1,'usuario',1,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 13:44:13.464386');
INSERT INTO "auditoria" VALUES(10,1,'usuario',1,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 13:55:03.155832');
INSERT INTO "auditoria" VALUES(11,2,'usuario',2,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 13:55:05.450352');
INSERT INTO "auditoria" VALUES(12,3,'usuario',3,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 13:55:07.760467');
INSERT INTO "auditoria" VALUES(13,4,'usuario',4,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 13:55:10.037041');
INSERT INTO "auditoria" VALUES(14,5,'usuario',5,'ACTUALIZAR','null','{"accion_original": "LOGIN", "ip": "127.0.0.1"}','2026-10-09 13:55:12.336996');
CREATE TABLE clientes (
	id_cliente INTEGER NOT NULL, 
	codigo_externo VARCHAR(80) NOT NULL, 
	razon_social VARCHAR(200) NOT NULL, 
	direccion VARCHAR(300) NOT NULL, 
	distrito VARCHAR(100), 
	provincia VARCHAR(100), 
	latitud NUMERIC(9, 6) NOT NULL, 
	longitud NUMERIC(9, 6) NOT NULL, 
	activo BOOLEAN NOT NULL, 
	fecha_creacion DATETIME NOT NULL, 
	PRIMARY KEY (id_cliente)
);
INSERT INTO "clientes" VALUES(1,'CLI-9301982','QUIÑONES VALENZUELA, VIRGINIA','Jr. Madre Selva 592, Urb. Santa Isabel','Carabayllo','Lima',-11.87,-77.03,1,'2026-10-09 08:43:36.850708');
INSERT INTO "clientes" VALUES(2,'CLI-9300963','FARMA IMPERIO S.A.C.','Av. Los Jardines Este Mz B Lote 4','San Juan de Lurigancho','Lima',-12.01,-77,1,'2026-10-09 08:43:36.850718');
INSERT INTO "clientes" VALUES(3,'CLI-9300778','RODRIGUEZ BERNAL RAMOS S.A.C.','Av. Sáenz Peña 1120','Callao','Lima',-12.06,-77.14,1,'2026-10-09 08:43:36.850721');
INSERT INTO "clientes" VALUES(4,'CLI-9300891','GRUPO FAMEZA S.A.C.','Z.I. Parque Industrial del Cono Sur','Villa El Salvador','Lima',-12.21,-76.94,1,'2026-10-09 08:43:36.850722');
INSERT INTO "clientes" VALUES(5,'CLI-3881628','GRUPO LIVES S.A.','Lote 2D 7E, Fundo Larrea Sub Lote A','Lurín','Lima',-12.26,-76.88,1,'2026-10-09 08:43:36.850724');
INSERT INTO "clientes" VALUES(6,'CLI-9303910','BOTICAS INKAFARMA — Los Olivos','Av. Alfredo Mendiola 3550','Los Olivos','Lima',-11.98,-77.07,1,'2026-10-09 08:43:36.850725');
INSERT INTO "clientes" VALUES(7,'CLI-9301880','BOTICAS BIOFARMAS SALUD Y VIDA S.A.C.','Av. Próceres de la Independencia 1820','San Juan de Lurigancho','Lima',-11.99,-76.99,1,'2026-10-09 08:43:36.850728');
INSERT INTO "clientes" VALUES(8,'CLI-9303120','FERRETERÍA SAN FELIPE S.A.C.','Av. Grau 902','Ate','Lima',-12.03,-76.92,1,'2026-10-09 08:43:36.850729');
INSERT INTO "clientes" VALUES(9,'CLI-9303380','DISTRIB. LUZ Y COLOR S.A.C.','Av. El Sol 1120','Villa El Salvador','Lima',-12.215,-76.942,1,'2026-10-09 08:43:36.850731');
INSERT INTO "clientes" VALUES(10,'CLI-9400137','COMERCIAL LOS ANDES E.I.R.L.','Mz. J Lote 8','San Martín de Porres','Lima',-12,-77.08,1,'2026-10-09 08:43:36.850732');
INSERT INTO "clientes" VALUES(11,'CLI-9400248','ABARROTES EL SOL S.A.C.','Av. Arequipa 1890','Lince','Lima',-12.083,-77.033,1,'2026-10-09 08:43:36.850733');
INSERT INTO "clientes" VALUES(12,'CLI-9400285','MINIMARKET PROGRESO','Jr. Sáenz Peña 610','Callao','Lima',-12.057,-77.135,1,'2026-10-09 08:43:36.850735');
CREATE TABLE cobros (
	id VARCHAR(36) NOT NULL, 
	parada_id BIGINT, 
	pedido_id BIGINT, 
	metodo_pago VARCHAR(30) NOT NULL, 
	monto_esperado NUMERIC(12, 2) NOT NULL, 
	monto_cobrado NUMERIC(12, 2) NOT NULL, 
	estado VARCHAR(30) NOT NULL, 
	nota TEXT, 
	registrado_por BIGINT, 
	validado_por BIGINT, 
	fecha_registro DATETIME NOT NULL, 
	fecha_validacion DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(parada_id) REFERENCES paradas_ruta (id_parada), 
	FOREIGN KEY(pedido_id) REFERENCES pedidos (id_pedido), 
	FOREIGN KEY(registrado_por) REFERENCES usuarios (id_usuario), 
	FOREIGN KEY(validado_por) REFERENCES usuarios (id_usuario)
);
CREATE TABLE comprobantes_pago (
	id VARCHAR(36) NOT NULL, 
	cobro_id VARCHAR(36) NOT NULL, 
	nombre_archivo VARCHAR(255) NOT NULL, 
	tipo_mime VARCHAR(100) NOT NULL, 
	tamanio_bytes INTEGER NOT NULL, 
	ruta_almacenamiento VARCHAR(500) NOT NULL, 
	subido_en DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cobro_id) REFERENCES cobros (id)
);
CREATE TABLE ejecuciones_optimizacion (
	id_ejecucion INTEGER NOT NULL, 
	id_vehiculo BIGINT NOT NULL, 
	fecha_planificacion DATE NOT NULL, 
	algoritmo VARCHAR(40) NOT NULL, 
	modelo VARCHAR(40) NOT NULL, 
	tamano_poblacion INTEGER NOT NULL, 
	numero_generaciones INTEGER NOT NULL, 
	peso_distancia NUMERIC(8, 4) NOT NULL, 
	peso_tiempo NUMERIC(8, 4) NOT NULL, 
	mejor_fitness NUMERIC(18, 6), 
	estado VARCHAR(20) NOT NULL, 
	fecha_inicio DATETIME NOT NULL, 
	fecha_fin DATETIME, 
	PRIMARY KEY (id_ejecucion), 
	FOREIGN KEY(id_vehiculo) REFERENCES vehiculos (id_vehiculo)
);
CREATE TABLE evidencias_entrega (
	id VARCHAR(36) NOT NULL, 
	parada_id BIGINT NOT NULL, 
	tipo VARCHAR(30) NOT NULL, 
	nombre_archivo VARCHAR(255) NOT NULL, 
	tipo_mime VARCHAR(100) NOT NULL, 
	tamanio_bytes INTEGER NOT NULL, 
	ruta_almacenamiento VARCHAR(500) NOT NULL, 
	subido_en DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(parada_id) REFERENCES paradas_ruta (id_parada)
);
CREATE TABLE importaciones_pedidos (
	id VARCHAR(36) NOT NULL, 
	nombre_archivo VARCHAR(255) NOT NULL, 
	filas_totales INTEGER NOT NULL, 
	filas_validas INTEGER NOT NULL, 
	filas_con_error INTEGER NOT NULL, 
	estado VARCHAR(30) NOT NULL, 
	errores JSON, 
	importado_por BIGINT, 
	creado_en DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(importado_por) REFERENCES usuarios (id_usuario)
);
CREATE TABLE incidencias (
	id_incidencia INTEGER NOT NULL, 
	id_parada BIGINT NOT NULL, 
	tipo VARCHAR(35) NOT NULL, 
	descripcion VARCHAR(1000) NOT NULL, 
	fecha_hora DATETIME NOT NULL, 
	estado VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id_incidencia), 
	FOREIGN KEY(id_parada) REFERENCES paradas_ruta (id_parada)
);
CREATE TABLE observaciones_cobro (
	id VARCHAR(36) NOT NULL, 
	cobro_id VARCHAR(36) NOT NULL, 
	usuario_id BIGINT, 
	motivo VARCHAR(100) NOT NULL, 
	detalle TEXT, 
	creado_en DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cobro_id) REFERENCES cobros (id), 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id_usuario)
);
CREATE TABLE paradas_ruta (
	id_parada INTEGER NOT NULL, 
	id_ruta BIGINT NOT NULL, 
	id_pedido BIGINT NOT NULL, 
	secuencia INTEGER NOT NULL, 
	eta_estimada DATETIME, 
	distancia_anterior_km NUMERIC(12, 3) NOT NULL, 
	tiempo_desde_anterior_min INTEGER NOT NULL, 
	tiempo_servicio_min INTEGER NOT NULL, 
	bloqueada_manual BOOLEAN NOT NULL, 
	estado VARCHAR(20) NOT NULL, 
	hora_llegada_real DATETIME, 
	fecha_creacion DATETIME NOT NULL, 
	PRIMARY KEY (id_parada), 
	FOREIGN KEY(id_ruta) REFERENCES rutas (id_ruta), 
	FOREIGN KEY(id_pedido) REFERENCES pedidos (id_pedido)
);
CREATE TABLE pedidos (
	id_pedido INTEGER NOT NULL, 
	codigo_externo VARCHAR(80) NOT NULL, 
	id_cliente BIGINT NOT NULL, 
	id_vehiculo BIGINT, 
	fecha_pedido DATETIME NOT NULL, 
	fecha_programada DATE NOT NULL, 
	peso_kg NUMERIC(12, 2) NOT NULL, 
	volumen_m3 NUMERIC(12, 3) NOT NULL, 
	importe NUMERIC(12, 2) NOT NULL, 
	estado VARCHAR(25) NOT NULL, 
	habilitado_despacho BOOLEAN NOT NULL, 
	origen VARCHAR(50) NOT NULL, 
	fecha_creacion DATETIME NOT NULL, 
	PRIMARY KEY (id_pedido), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente), 
	FOREIGN KEY(id_vehiculo) REFERENCES vehiculos (id_vehiculo)
);
INSERT INTO "pedidos" VALUES(3881628,'3881628',5,5,'2026-10-09 08:43:36.877380','2026-08-27',2434,0.63,4200,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885439');
INSERT INTO "pedidos" VALUES(9300778,'9300778',3,2,'2026-10-09 08:43:36.874926','2026-08-27',800,0.31,1600,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885437');
INSERT INTO "pedidos" VALUES(9300891,'9300891',4,4,'2026-10-09 08:43:36.876468','2026-08-27',3500,0.17,5400,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885438');
INSERT INTO "pedidos" VALUES(9300963,'9300963',2,3,'2026-10-09 08:43:36.873689','2026-08-27',1881,0.12,3100,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885436');
INSERT INTO "pedidos" VALUES(9301880,'9301880',7,3,'2026-10-09 08:43:36.879081','2026-08-27',640,0.55,1760,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885440');
INSERT INTO "pedidos" VALUES(9301982,'9301982',1,1,'2026-10-09 08:43:36.872819','2026-08-27',520,1.15,850,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885430');
INSERT INTO "pedidos" VALUES(9303120,'9303120',8,3,'2026-10-09 08:43:36.879934','2026-08-27',720,0.9,1340,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885441');
INSERT INTO "pedidos" VALUES(9303380,'9303380',9,4,'2026-10-09 08:43:36.880714','2026-08-27',950,1.1,1100,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885442');
INSERT INTO "pedidos" VALUES(9303910,'9303910',6,1,'2026-10-09 08:43:36.878249','2026-08-27',420,0.85,2340,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885439');
INSERT INTO "pedidos" VALUES(9400137,'9400137',10,1,'2026-10-09 08:43:36.881486','2026-08-27',310,0.4,310,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885443');
INSERT INTO "pedidos" VALUES(9400248,'9400248',11,5,'2026-10-09 08:43:36.882243','2026-08-27',540,0.7,780,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885443');
INSERT INTO "pedidos" VALUES(9400285,'9400285',12,5,'2026-10-09 08:43:36.883529','2026-08-27',410,0.5,340,'PENDIENTE',1,'TOMAPEDIDOS','2026-10-09 08:43:36.885444');
CREATE TABLE pedidos_no_asignados (
	id VARCHAR(36) NOT NULL, 
	version_id VARCHAR(36) NOT NULL, 
	pedido_id BIGINT NOT NULL, 
	codigo VARCHAR(50), 
	motivo VARCHAR(255), 
	PRIMARY KEY (id), 
	FOREIGN KEY(version_id) REFERENCES planificaciones_versiones (id), 
	FOREIGN KEY(pedido_id) REFERENCES pedidos (id_pedido)
);
CREATE TABLE planificaciones (
	id VARCHAR(36) NOT NULL, 
	fecha VARCHAR(10) NOT NULL, 
	version_vigente INTEGER NOT NULL, 
	creada_por VARCHAR(50), 
	creado_en DATETIME NOT NULL, 
	PRIMARY KEY (id)
);
CREATE TABLE planificaciones_versiones (
	id VARCHAR(36) NOT NULL, 
	planificacion_id VARCHAR(36) NOT NULL, 
	numero INTEGER NOT NULL, 
	estado VARCHAR(30) NOT NULL, 
	motivo VARCHAR(255), 
	parametros JSON, 
	resumen JSON, 
	metodo VARCHAR(50) NOT NULL, 
	creada_por VARCHAR(50), 
	confirmada_por VARCHAR(50), 
	confirmada_en DATETIME, 
	creado_en DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(planificacion_id) REFERENCES planificaciones (id)
);
CREATE TABLE reglas_cliente (
	id_regla INTEGER NOT NULL, 
	id_cliente BIGINT NOT NULL, 
	tipo_regla VARCHAR(30) NOT NULL, 
	dia_semana SMALLINT, 
	hora_inicio TIME, 
	hora_fin TIME, 
	valor VARCHAR(255), 
	es_restriccion_dura BOOLEAN NOT NULL, 
	activa BOOLEAN NOT NULL, 
	observacion VARCHAR(500), 
	fecha_creacion DATETIME NOT NULL, 
	fecha_actualizacion DATETIME NOT NULL, 
	PRIMARY KEY (id_regla), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente)
);
INSERT INTO "reglas_cliente" VALUES(1,1,'VENTANA_HORARIA',NULL,'09:00:00.000000','13:00:00.000000',NULL,1,1,NULL,'2026-10-09 08:43:36.869182','2026-10-09 08:43:36.869188');
INSERT INTO "reglas_cliente" VALUES(2,2,'VENTANA_HORARIA',NULL,'08:00:00.000000','11:00:00.000000',NULL,1,1,NULL,'2026-10-09 08:43:36.869189','2026-10-09 08:43:36.869190');
INSERT INTO "reglas_cliente" VALUES(3,3,'VENTANA_HORARIA',NULL,'08:00:00.000000','12:00:00.000000',NULL,1,1,NULL,'2026-10-09 08:43:36.869191','2026-10-09 08:43:36.869191');
INSERT INTO "reglas_cliente" VALUES(4,4,'VENTANA_HORARIA',NULL,'14:00:00.000000','17:00:00.000000',NULL,1,1,NULL,'2026-10-09 08:43:36.869192','2026-10-09 08:43:36.869193');
INSERT INTO "reglas_cliente" VALUES(5,5,'VENTANA_HORARIA',NULL,'09:00:00.000000','10:00:00.000000',NULL,1,1,NULL,'2026-10-09 08:43:36.869193','2026-10-09 08:43:36.869194');
INSERT INTO "reglas_cliente" VALUES(6,6,'VENTANA_HORARIA',NULL,'08:00:00.000000','14:00:00.000000',NULL,0,1,NULL,'2026-10-09 08:43:36.869195','2026-10-09 08:43:36.869196');
INSERT INTO "reglas_cliente" VALUES(7,7,'VENTANA_HORARIA',NULL,'10:00:00.000000','16:00:00.000000',NULL,0,1,NULL,'2026-10-09 08:43:36.869196','2026-10-09 08:43:36.869197');
INSERT INTO "reglas_cliente" VALUES(8,8,'VENTANA_HORARIA',NULL,'09:00:00.000000','15:00:00.000000',NULL,0,1,NULL,'2026-10-09 08:43:36.869198','2026-10-09 08:43:36.869198');
INSERT INTO "reglas_cliente" VALUES(9,9,'VENTANA_HORARIA',NULL,'13:00:00.000000','18:00:00.000000',NULL,1,1,NULL,'2026-10-09 08:43:36.869199','2026-10-09 08:43:36.869199');
INSERT INTO "reglas_cliente" VALUES(10,10,'VENTANA_HORARIA',NULL,'09:00:00.000000','15:00:00.000000',NULL,0,1,NULL,'2026-10-09 08:43:36.869200','2026-10-09 08:43:36.869201');
INSERT INTO "reglas_cliente" VALUES(11,11,'VENTANA_HORARIA',NULL,'08:00:00.000000','13:00:00.000000',NULL,0,1,NULL,'2026-10-09 08:43:36.869202','2026-10-09 08:43:36.869202');
INSERT INTO "reglas_cliente" VALUES(12,12,'VENTANA_HORARIA',NULL,'08:00:00.000000','13:00:00.000000',NULL,1,1,NULL,'2026-10-09 08:43:36.869203','2026-10-09 08:43:36.869203');
CREATE TABLE roles (
	id_rol INTEGER NOT NULL, 
	nombre VARCHAR(50) NOT NULL, 
	descripcion VARCHAR(255), 
	PRIMARY KEY (id_rol), 
	UNIQUE (nombre)
);
INSERT INTO "roles" VALUES(1,'JEFE','Jefe de Distribución — Aprobador');
INSERT INTO "roles" VALUES(2,'ASISTENTE','Asistente de Distribución — Planificador');
INSERT INTO "roles" VALUES(3,'ADMINISTRADOR','Administrador de Tecnologías de Información');
INSERT INTO "roles" VALUES(4,'REPARTIDOR','Conductor y Repartidor de Flota');
INSERT INTO "roles" VALUES(5,'TESORERIA','Finanzas y Liquidación de Cobros');
CREATE TABLE rutas (
	id_ruta INTEGER NOT NULL, 
	id_vehiculo BIGINT NOT NULL, 
	id_ejecucion BIGINT, 
	fecha_ruta DATE NOT NULL, 
	estado VARCHAR(20) NOT NULL, 
	distancia_total_km NUMERIC(12, 3) NOT NULL, 
	tiempo_estimado_min INTEGER NOT NULL, 
	fitness NUMERIC(18, 6), 
	id_usuario_aprobador BIGINT, 
	fecha_aprobacion DATETIME, 
	fecha_creacion DATETIME NOT NULL, 
	PRIMARY KEY (id_ruta), 
	FOREIGN KEY(id_vehiculo) REFERENCES vehiculos (id_vehiculo), 
	FOREIGN KEY(id_ejecucion) REFERENCES ejecuciones_optimizacion (id_ejecucion), 
	FOREIGN KEY(id_usuario_aprobador) REFERENCES usuarios (id_usuario)
);
CREATE TABLE token_refresco (
	id VARCHAR(36) NOT NULL, 
	usuario_id BIGINT NOT NULL, 
	hash_token VARCHAR(255) NOT NULL, 
	expira_en DATETIME NOT NULL, 
	revocado BOOLEAN NOT NULL, 
	creado_en DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id_usuario), 
	UNIQUE (hash_token)
);
INSERT INTO "token_refresco" VALUES('642ada50-f8b9-4cdb-b767-9b99bb041e12',1,'IDCBGRGt783uTAL1mRfdCM4Tff9Xs0oU','2026-10-09 09:03:19.555856',0,'2026-10-09 09:03:19.565836');
INSERT INTO "token_refresco" VALUES('40d6f505-0ce0-4263-be3e-a893d2abe893',1,'V-xn1YL7uPpy1UsM7bmX6txOtASMScSw','2026-10-09 09:03:27.487633',0,'2026-10-09 09:03:27.492142');
INSERT INTO "token_refresco" VALUES('c8f6de61-0eff-4538-b493-b6520034cab7',1,'FG7OUeGHpeaU2aJn8Jl8x1sW2qIkKzSI','2026-10-09 09:05:16.019574',0,'2026-10-09 09:05:16.032662');
INSERT INTO "token_refresco" VALUES('14dc0673-f513-49d7-86c3-6fbfb43f629a',1,'Q1aq9xfsVSPnv1JLJRnMXilCRuScahIE','2026-10-09 09:11:07.119338',0,'2026-10-09 09:11:07.130108');
INSERT INTO "token_refresco" VALUES('992d7f9f-7a33-462a-a73a-52d397663700',1,'u92s3KaZVsgNpFRB8pQmb3x2U-Khxzts','2026-10-09 09:11:16.235245',0,'2026-10-09 09:11:16.242613');
INSERT INTO "token_refresco" VALUES('1ed64f76-9248-43eb-8f59-7fd3e0236a62',1,'CB25GfNn8dNQL21mDtQTIZkExYMCWGac','2026-10-09 09:13:05.747215',0,'2026-10-09 09:13:05.763339');
INSERT INTO "token_refresco" VALUES('2eb00f9b-9890-445e-846d-cb4d5655bcdc',1,'bRkukMn2jg1EHLc5GNK4rj1X6Ahhtlsk','2026-10-09 13:43:06.196543',0,'2026-10-09 13:43:06.212826');
INSERT INTO "token_refresco" VALUES('e3526911-6ded-4f4d-989a-2154067dac17',1,'XrjAHdXGEmWsNqj2CC1S4AQ7nHoUHoVc','2026-10-09 13:44:13.464076',0,'2026-10-09 13:44:13.474956');
INSERT INTO "token_refresco" VALUES('c1d17e76-3bfb-4267-a326-08f2fe2920c1',1,'Y37ff7vKc-jOLF6bkCcvO4PG3OmkRD0k','2026-10-09 13:55:03.155550',0,'2026-10-09 13:55:03.171060');
INSERT INTO "token_refresco" VALUES('f30b9854-594a-4b41-a2be-bc2b5b5e84c2',2,'0A3UAmaqAxNguGPkEkgPBgk52lS2NhP0','2026-10-09 13:55:05.450053',0,'2026-10-09 13:55:05.476002');
INSERT INTO "token_refresco" VALUES('242df83d-5659-4e37-a083-a7613ecf466d',3,'emCUoSEkcJbjmTCtElZcB9bppz-NFW0A','2026-10-09 13:55:07.760175',0,'2026-10-09 13:55:07.771369');
INSERT INTO "token_refresco" VALUES('eacc6ea2-0e34-4e35-bd1d-94499d9937d0',4,'xbCHZmoKnDfgX6ImXLB8H9Fv-HHYiUEs','2026-10-09 13:55:10.036794',0,'2026-10-09 13:55:10.047064');
INSERT INTO "token_refresco" VALUES('9e232db7-588b-49c3-91ff-f6401ded63cc',5,'TKE7WW6y0gaoLEM6jZWH6qtvkBPsHUyM','2026-10-09 13:55:12.336745',0,'2026-10-09 13:55:12.347323');
CREATE TABLE usuarios (
	id_usuario INTEGER NOT NULL, 
	id_rol BIGINT NOT NULL, 
	nombres VARCHAR(100) NOT NULL, 
	apellidos VARCHAR(100) NOT NULL, 
	correo VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	activo BOOLEAN NOT NULL, 
	fecha_creacion DATETIME NOT NULL, 
	PRIMARY KEY (id_usuario), 
	FOREIGN KEY(id_rol) REFERENCES roles (id_rol)
);
INSERT INTO "usuarios" VALUES(1,1,'Dennys','Huerta','dhuerta@alfadistribuidores.com','$argon2id$v=19$m=65536,t=3,p=4$a64Afsdn9IIVRR9EjWpUXw$t9N4+aGRKr8HuAOGbAJajHnQOUUPju/gRw6z62KeH9c',1,'2026-10-09 08:43:36.807998');
INSERT INTO "usuarios" VALUES(2,2,'Lesli','Pomalaya','lpomalaya@alfadistribuidores.com','$argon2id$v=19$m=65536,t=3,p=4$Uofcp6en0kyIr3cFZO/dYw$oCvId4jW/Iead2k7BJqWXtW50aPHpWkcjKgB8/LrQbI',1,'2026-10-09 08:43:36.808012');
INSERT INTO "usuarios" VALUES(3,3,'Administrador','TI','admin.ti@alfadistribuidores.com','$argon2id$v=19$m=65536,t=3,p=4$OtkWbZ2Zv+wtcuJjddC6OQ$a27S5PTqKJTJ4W5ikAneQPIDh7l5fZ6Xhh8MXeDFWfY',1,'2026-10-09 08:43:36.808016');
INSERT INTO "usuarios" VALUES(4,4,'Elías','López','elopez@alfadistribuidores.com','$argon2id$v=19$m=65536,t=3,p=4$epvKZiJVd8oAVbDsA4Ks5A$pT8FylOPZ2Gd1qWzm8DVebxm//+6oEFsHbqRjbymSZQ',1,'2026-10-09 08:43:36.808018');
INSERT INTO "usuarios" VALUES(5,5,'Mariana','Vásquez','tesoreria@alfadistribuidores.com','$argon2id$v=19$m=65536,t=3,p=4$bR6AXOzjhlkdysJxkhzbkg$xHUnHIQJu7T0GG2nl/CLdZH0eiFc51t36dAiHTZvyTw',1,'2026-10-09 08:43:36.808019');
CREATE TABLE vehiculos (
	id_vehiculo INTEGER NOT NULL, 
	codigo_externo VARCHAR(80) NOT NULL, 
	placa VARCHAR(20) NOT NULL, 
	marca VARCHAR(80), 
	modelo VARCHAR(80), 
	capacidad_kg NUMERIC(12, 2) NOT NULL, 
	capacidad_m3 NUMERIC(12, 3) NOT NULL, 
	estado VARCHAR(20) NOT NULL, 
	activo BOOLEAN NOT NULL, 
	PRIMARY KEY (id_vehiculo), 
	UNIQUE (codigo_externo)
);
INSERT INTO "vehiculos" VALUES(1,'VEH-001','BCE-869','Hyundai','HD78',12000,32,'ASIGNADO',1);
INSERT INTO "vehiculos" VALUES(2,'VEH-002','DB8-877','Toyota','Dyna',12000,32,'ASIGNADO',1);
INSERT INTO "vehiculos" VALUES(3,'VEH-003','AFG-747','Suzuki','Super Carry',8000,21,'ASIGNADO',1);
INSERT INTO "vehiculos" VALUES(4,'VEH-004','BHL-751','Kia','Bongo',8000,21,'ASIGNADO',1);
INSERT INTO "vehiculos" VALUES(5,'VEH-005','XXX-000','Isuzu','N-Series',8000,21,'ASIGNADO',1);
INSERT INTO "vehiculos" VALUES(6,'VEH-006','BUE-734','Hino','300',8000,21,'MANTENIMIENTO',1);
INSERT INTO "vehiculos" VALUES(7,'VEH-007','AFG-748','Foton','Aumark',6000,16,'INACTIVO',1);
CREATE UNIQUE INDEX ix_vehiculos_placa ON vehiculos (placa);
CREATE UNIQUE INDEX ix_clientes_codigo_externo ON clientes (codigo_externo);
CREATE UNIQUE INDEX ix_usuarios_correo ON usuarios (correo);
CREATE UNIQUE INDEX ix_pedidos_codigo_externo ON pedidos (codigo_externo);
COMMIT;
