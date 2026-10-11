-- Política de autorización configurable, sin modificar entidades operativas.
ALTER TABLE siprd.roles ADD COLUMN IF NOT EXISTS permisos jsonb;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_roles_permisos_array' AND conrelid='siprd.roles'::regclass) THEN ALTER TABLE siprd.roles ADD CONSTRAINT ck_roles_permisos_array CHECK (permisos IS NULL OR jsonb_typeof(permisos) = 'array'); END IF; END $$;
