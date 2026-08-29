-- Establish canonical ownership from BPM/RCA_TREE entities to graph nodes.
-- This phase is intentionally additive; legacy columns remain until the
-- application and graph queries no longer depend on them.

ALTER TABLE contrato ADD COLUMN IF NOT EXISTS node_id BIGINT;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS node_id BIGINT;
ALTER TABLE proceso ADD COLUMN IF NOT EXISTS node_id BIGINT;

INSERT INTO node (node_type, code, name, description, status, metadata)
SELECT 'PROCESS', 'PROCESS:' || p.id, p.nombre, NULL, 'active', '{}'::jsonb
FROM proceso p
LEFT JOIN node n ON n.legacy_table = 'proceso' AND n.legacy_id = p.id
WHERE n.id IS NULL
ON CONFLICT (code) DO NOTHING;

INSERT INTO node (node_type, code, name, description, status, metadata)
SELECT 'CONTRACT', 'CONTRACT:' || c.id, c.nombre, NULL, CASE WHEN c.activo THEN 'active' ELSE 'inactive' END, '{}'::jsonb
FROM contrato c
LEFT JOIN node n ON n.legacy_table = 'contrato' AND n.legacy_id = c.id
WHERE n.id IS NULL
ON CONFLICT (code) DO NOTHING;

INSERT INTO node (node_type, code, name, description, status, metadata)
SELECT 'MACHINE', 'MACHINE:' || m.id, m.nombre, NULL, CASE WHEN m.activo THEN 'active' ELSE 'inactive' END, '{}'::jsonb
FROM maquina m
LEFT JOIN node n ON n.legacy_table = 'maquina' AND n.legacy_id = m.id
WHERE n.id IS NULL
ON CONFLICT (code) DO NOTHING;

UPDATE node n
SET legacy_table = 'proceso', legacy_id = p.id, updated_at = NOW()
FROM proceso p
WHERE n.code = 'PROCESS:' || p.id
  AND n.legacy_table IS NULL;

UPDATE node n
SET legacy_table = 'contrato', legacy_id = c.id, updated_at = NOW()
FROM contrato c
WHERE n.code = 'CONTRACT:' || c.id
  AND n.legacy_table IS NULL;

UPDATE node n
SET legacy_table = 'maquina', legacy_id = m.id, updated_at = NOW()
FROM maquina m
WHERE n.code = 'MACHINE:' || m.id
  AND n.legacy_table IS NULL;

UPDATE contrato c
SET node_id = n.id
FROM node n
WHERE n.legacy_table = 'contrato' AND n.legacy_id = c.id;

UPDATE maquina m
SET node_id = n.id
FROM node n
WHERE n.legacy_table = 'maquina' AND n.legacy_id = m.id;

UPDATE proceso p
SET node_id = n.id
FROM node n
WHERE n.legacy_table = 'proceso' AND n.legacy_id = p.id;

DO $$
BEGIN
    ALTER TABLE contrato
        ADD CONSTRAINT contrato_node_fk FOREIGN KEY (node_id) REFERENCES node(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE maquina
        ADD CONSTRAINT maquina_node_fk FOREIGN KEY (node_id) REFERENCES node(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS contrato_node_id_unq ON contrato(node_id);
CREATE UNIQUE INDEX IF NOT EXISTS maquina_node_id_unq ON maquina(node_id);
CREATE UNIQUE INDEX IF NOT EXISTS proceso_node_id_unq ON proceso(node_id);
