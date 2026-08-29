-- Final development-schema reconciliation.
--
-- This script is intentionally limited to the final mutable-process model.
-- A database containing pm_process_version is outside the supported final
-- development schema and must be recreated from db_management/schema.sql.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.pm_process_version') IS NOT NULL THEN
        RAISE EXCEPTION 'La base contiene pm_process_version; recrear la base con el esquema final';
    END IF;
END $$;

ALTER TABLE proceso ADD COLUMN IF NOT EXISTS node_id BIGINT;
ALTER TABLE contrato ADD COLUMN IF NOT EXISTS node_id BIGINT;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS node_id BIGINT;

-- Existing final-schema databases already have these references. The guarded
-- blocks make the reconciliation safe when a database was initialized from
-- an intermediate schema that only created the columns.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proceso_node_fk') THEN
        ALTER TABLE proceso ADD CONSTRAINT proceso_node_fk FOREIGN KEY (node_id) REFERENCES node(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contrato_node_fk') THEN
        ALTER TABLE contrato ADD CONSTRAINT contrato_node_fk FOREIGN KEY (node_id) REFERENCES node(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maquina_node_fk') THEN
        ALTER TABLE maquina ADD CONSTRAINT maquina_node_fk FOREIGN KEY (node_id) REFERENCES node(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Backfill is possible only when the canonical node code is already present.
-- No legacy identity columns are recreated or inferred.
UPDATE proceso p SET node_id = n.id
FROM node n
WHERE p.node_id IS NULL AND n.code = 'PROCESS:' || p.id;
UPDATE contrato c SET node_id = n.id
FROM node n
WHERE c.node_id IS NULL AND n.code = 'CONTRACT:' || c.id;
UPDATE maquina m SET node_id = n.id
FROM node n
WHERE m.node_id IS NULL AND n.code = 'MACHINE:' || m.id;

CREATE UNIQUE INDEX IF NOT EXISTS proceso_node_id_unq ON proceso(node_id);
CREATE UNIQUE INDEX IF NOT EXISTS contrato_node_id_unq ON contrato(node_id);
CREATE UNIQUE INDEX IF NOT EXISTS maquina_node_id_unq ON maquina(node_id);

ALTER TABLE node DROP CONSTRAINT IF EXISTS node_legacy_unq;
ALTER TABLE node DROP COLUMN IF EXISTS legacy_table;
ALTER TABLE node DROP COLUMN IF EXISTS legacy_id;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM proceso WHERE node_id IS NULL)
       OR EXISTS (SELECT 1 FROM contrato WHERE node_id IS NULL)
       OR EXISTS (SELECT 1 FROM maquina WHERE node_id IS NULL) THEN
        RAISE EXCEPTION 'La reconciliación no puede finalizar: existe ownership sin node_id';
    END IF;
END $$;

COMMIT;
