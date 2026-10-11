-- Roles de negocio: Cobranzas es exclusivo de Tesorería.
-- Los accesos diarios de reparto sólo los administra Distribución.
UPDATE siprd.roles
SET permisos = '["inicio","algoritmo","rutas","config","vehiculos","restricciones","clientes","pedidos","confirmar","accesos"]'::jsonb
WHERE nombre IN ('ASISTENTE_DISTRIBUCION', 'ASISTENTE');

UPDATE siprd.roles
SET permisos = '["inicio","algoritmo","rutas","config","vehiculos","restricciones","clientes","pedidos","confirmar","accesos","registros"]'::jsonb
WHERE nombre IN ('JEFE_DISTRIBUCION', 'JEFE');

UPDATE siprd.roles
SET permisos = '["cobranzas","validar_cobros","cerrar_pedidos","pedidos"]'::jsonb
WHERE nombre = 'TESORERIA';

UPDATE siprd.roles
SET permisos = '["reparto","cerrar_pedidos"]'::jsonb
WHERE nombre = 'REPARTIDOR';

UPDATE siprd.roles
SET permisos = '["inicio","config","registros","vehiculos","restricciones","clientes","pedidos","usuarios","roles"]'::jsonb
WHERE nombre = 'ADMINISTRADOR';
