-- R19 total migration. Run as one PostgreSQL transaction against an existing
-- installation. It deliberately removes the affected legacy representation.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE contrato ADD COLUMN IF NOT EXISTS kpi_description TEXT;
ALTER TABLE contrato ADD COLUMN IF NOT EXISTS kpi_args TEXT NOT NULL DEFAULT '';
ALTER TABLE contrato ADD COLUMN IF NOT EXISTS kpi_function TEXT NOT NULL DEFAULT '';
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contrato' AND column_name='metrica') THEN
        UPDATE contrato SET kpi_description = COALESCE(NULLIF(metrica, ''), 'Pendiente de definir KPI') WHERE kpi_description IS NULL OR kpi_description = '';
        ALTER TABLE contrato DROP COLUMN metrica;
    ELSE
        UPDATE contrato SET kpi_description = 'Pendiente de definir KPI' WHERE kpi_description IS NULL OR kpi_description = '';
    END IF;
END $$;
ALTER TABLE contrato ALTER COLUMN kpi_description SET NOT NULL;
DO $$ BEGIN
    ALTER TABLE contrato ADD CONSTRAINT contrato_kpi_description_chk CHECK (kpi_description <> '');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE causa ADD COLUMN IF NOT EXISTS is_initial_template BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hipotesis ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE hipotesis ADD COLUMN IF NOT EXISTS is_initial_template BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hipotesis ADD COLUMN IF NOT EXISTS kpi_args TEXT NOT NULL DEFAULT '';
ALTER TABLE hipotesis ADD COLUMN IF NOT EXISTS kpi_function TEXT NOT NULL DEFAULT '';
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hipotesis' AND column_name='descripcion') THEN
        ALTER TABLE hipotesis ADD COLUMN descripcion TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hipotesis' AND column_name='nombre') THEN
        UPDATE hipotesis SET nombre = COALESCE(nombre, descripcion, 'Hipótesis inicial');
    END IF;
END $$;
UPDATE hipotesis SET nombre = COALESCE(nombre, descripcion, 'Hipótesis inicial');
ALTER TABLE hipotesis ALTER COLUMN nombre SET NOT NULL;

-- Copy before removing the legacy type.  A direct UPDATE can violate the
-- logical-edge unique constraint when a target edge already exists.
INSERT INTO relationship(parent_node_id, child_node_id, relationship_type, metadata, is_primary)
SELECT r.parent_node_id, r.child_node_id, 'CAUSES', r.metadata, r.is_primary
  FROM relationship r
 WHERE r.relationship_type='DEPENDS_ON'
   AND EXISTS (SELECT 1 FROM node p JOIN contrato c ON c.node_id=p.id WHERE p.id=r.parent_node_id)
   AND EXISTS (SELECT 1 FROM node ch JOIN causa ca ON ca.node_id=ch.id WHERE ch.id=r.child_node_id)
ON CONFLICT (parent_node_id, child_node_id, relationship_type) DO UPDATE
  SET is_primary=relationship.is_primary OR EXCLUDED.is_primary,
      metadata=relationship.metadata || EXCLUDED.metadata,
      updated_at=NOW();
DELETE FROM relationship r
 WHERE r.relationship_type='DEPENDS_ON'
   AND EXISTS (SELECT 1 FROM node p JOIN contrato c ON c.node_id=p.id WHERE p.id=r.parent_node_id)
   AND EXISTS (SELECT 1 FROM node ch JOIN causa ca ON ca.node_id=ch.id WHERE ch.id=r.child_node_id);
INSERT INTO relationship(parent_node_id, child_node_id, relationship_type, metadata, is_primary)
SELECT r.parent_node_id, r.child_node_id, 'HAS_HYPOTHESIS', r.metadata, r.is_primary
  FROM relationship r
 WHERE r.relationship_type='VERIFIED_BY'
   AND EXISTS (SELECT 1 FROM node p JOIN causa ca ON ca.node_id=p.id WHERE p.id=r.parent_node_id)
   AND EXISTS (SELECT 1 FROM node ch JOIN hipotesis h ON h.node_id=ch.id WHERE ch.id=r.child_node_id)
ON CONFLICT (parent_node_id, child_node_id, relationship_type) DO UPDATE
  SET is_primary=relationship.is_primary OR EXCLUDED.is_primary,
      metadata=relationship.metadata || EXCLUDED.metadata,
      updated_at=NOW();
DELETE FROM relationship r
 WHERE r.relationship_type='VERIFIED_BY'
   AND EXISTS (SELECT 1 FROM node p JOIN causa ca ON ca.node_id=p.id WHERE p.id=r.parent_node_id)
   AND EXISTS (SELECT 1 FROM node ch JOIN hipotesis h ON h.node_id=ch.id WHERE ch.id=r.child_node_id);

DO $$
DECLARE c RECORD; cn BIGINT; contract_node_id BIGINT; cause_node_id BIGINT;
        ca RECORD; h RECORD; hn BIGINT;
BEGIN
  FOR c IN SELECT * FROM contrato ORDER BY id LOOP
    IF c.node_id IS NULL THEN
      INSERT INTO node(node_type, code, name, description, metadata)
      VALUES ('CONTRACT', 'CONTRACT:TEMPLATE:'||c.id, c.nombre, c.objetivo,
              jsonb_build_object('template_role','contract','contract_id',c.id))
      RETURNING id INTO cn;
      UPDATE contrato SET node_id=cn WHERE id=c.id;
    ELSE cn := c.node_id; END IF;
    contract_node_id := cn;
    SELECT * INTO ca FROM causa WHERE contrato_id=c.id AND is_initial_template LIMIT 1;
    IF ca.id IS NULL THEN
      INSERT INTO node(node_type, code, name, description, metadata)
      VALUES ('CAUSE', 'CAUSE:TEMPLATE:'||c.id, c.nombre, c.objetivo,
              jsonb_build_object('template_role','initial_cause','contract_id',c.id))
      RETURNING id INTO cn;
      INSERT INTO causa(node_id, contrato_id, nombre, descripcion, is_initial_template)
      VALUES (cn,c.id,c.nombre,c.objetivo,TRUE) RETURNING * INTO ca;
    END IF;
    cause_node_id := ca.node_id;
    SELECT * INTO h FROM hipotesis WHERE causa_id=ca.id AND is_initial_template LIMIT 1;
    IF h.id IS NULL THEN
      INSERT INTO node(node_type, code, name, description, metadata)
      VALUES ('HYPOTHESIS', 'HYPOTHESIS:TEMPLATE:'||c.id, c.kpi_description, c.kpi_description,
              jsonb_build_object('template_role','initial_hypothesis','contract_id',c.id))
      RETURNING id INTO hn;
      INSERT INTO hipotesis(node_id, causa_id, nombre, descripcion, kpi_args, kpi_function, is_initial_template)
      VALUES (hn, ca.id,
              c.kpi_description, c.kpi_description, c.kpi_args, c.kpi_function, TRUE)
      RETURNING * INTO h;
    ELSE hn := h.node_id; END IF;
    INSERT INTO relationship(parent_node_id, child_node_id, relationship_type, is_primary, metadata)
      VALUES (contract_node_id, cause_node_id, 'CAUSES', TRUE, jsonb_build_object('template',true,'contract_id',c.id))
      ON CONFLICT DO NOTHING;
    INSERT INTO relationship(parent_node_id, child_node_id, relationship_type, is_primary, metadata)
      VALUES (cause_node_id, hn, 'HAS_HYPOTHESIS', TRUE, jsonb_build_object('template',true,'contract_id',c.id))
      ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_template_node ON contrato(node_id) WHERE node_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_initial_cause_per_contract ON causa(contrato_id) WHERE is_initial_template;
CREATE UNIQUE INDEX IF NOT EXISTS uq_initial_hypothesis_per_cause ON hipotesis(causa_id) WHERE is_initial_template;
ALTER TABLE analisis_causas DROP CONSTRAINT IF EXISTS analisis_causas_estado_check;
ALTER TABLE analisis_causas ADD CONSTRAINT analisis_causas_estado_check CHECK (estado IN ('abierto','cerrado'));

COMMIT;
