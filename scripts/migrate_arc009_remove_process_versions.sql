-- ARC-009 definitive migration: one mutable graph per BPM process.
-- Run once against the local PostgreSQL database. The transaction is atomic.
BEGIN;

LOCK TABLE pm_process_version, pm_process_node, pm_process_transition,
    machine_operation_configuration, pm_context_record, contrato IN ACCESS EXCLUSIVE MODE;

CREATE TEMP TABLE arc009_canonical_version ON COMMIT DROP AS
SELECT DISTINCT ON (process_id) process_id, version_id
FROM pm_process_version
ORDER BY process_id, version_number DESC, version_id DESC;

ALTER TABLE pm_process_node ADD COLUMN process_id UUID;
ALTER TABLE pm_process_transition ADD COLUMN process_id UUID;
ALTER TABLE pm_context_record ADD COLUMN process_id UUID;

UPDATE pm_process_node n SET process_id = v.process_id
FROM pm_process_version v WHERE v.version_id = n.version_id;
UPDATE pm_process_transition t SET process_id = v.process_id
FROM pm_process_version v WHERE v.version_id = t.version_id;
UPDATE pm_context_record r SET process_id = v.process_id
FROM pm_process_version v WHERE v.version_id = r.version_id;

-- Repoint references from discarded versions to the retained graph by node code.
UPDATE machine_operation_configuration c
SET operation_id = retained.node_id,
    process_id = retained.process_id
FROM pm_process_node old_node
JOIN pm_process_version old_version ON old_version.version_id = old_node.version_id
JOIN arc009_canonical_version cv ON cv.process_id = old_version.process_id
JOIN pm_process_node retained ON retained.process_id = cv.process_id
    AND retained.node_code = old_node.node_code
WHERE c.operation_id = old_node.node_id;
UPDATE contrato c
SET bpm_node_id = retained.node_id,
    bpm_process_id = NULL
FROM pm_process_node old_node
JOIN pm_process_version old_version ON old_version.version_id = old_node.version_id
JOIN arc009_canonical_version cv ON cv.process_id = old_version.process_id
JOIN pm_process_node retained ON retained.process_id = cv.process_id
    AND retained.node_code = old_node.node_code
WHERE c.bpm_node_id = old_node.node_id;
UPDATE pm_context_record r
SET node_id = retained.node_id
FROM pm_process_node old_node
JOIN pm_process_version old_version ON old_version.version_id = old_node.version_id
JOIN arc009_canonical_version cv ON cv.process_id = old_version.process_id
JOIN pm_process_node retained ON retained.process_id = cv.process_id
    AND retained.node_code = old_node.node_code
WHERE r.node_id = old_node.node_id;

-- Remove duplicate dependent rows before enforcing the new unique keys.
DELETE FROM machine_operation_configuration a USING machine_operation_configuration b
WHERE a.id > b.id AND a.machine_id=b.machine_id AND a.process_id=b.process_id AND a.operation_id=b.operation_id;
DELETE FROM pm_process_transition a USING pm_process_transition b
WHERE a.transition_id > b.transition_id AND a.process_id=b.process_id
  AND a.source_node_id=b.source_node_id AND a.target_node_id=b.target_node_id
  AND a.transition_type=b.transition_type;
DELETE FROM pm_process_node n
WHERE NOT EXISTS (SELECT 1 FROM arc009_canonical_version cv
                  JOIN pm_process_version v ON v.version_id=cv.version_id
                  WHERE v.version_id=n.version_id);

ALTER TABLE pm_process_node DROP CONSTRAINT IF EXISTS pm_process_node_version_id_fkey;
ALTER TABLE pm_process_transition DROP CONSTRAINT IF EXISTS pm_process_transition_version_id_fkey;
ALTER TABLE pm_context_record DROP CONSTRAINT IF EXISTS pm_context_record_version_id_fkey;
ALTER TABLE machine_operation_configuration DROP CONSTRAINT IF EXISTS machine_operation_configuration_process_version_id_fkey;
ALTER TABLE machine_operation_configuration DROP CONSTRAINT IF EXISTS machine_operation_configuration_unq;
ALTER TABLE pm_process_node DROP COLUMN version_id;
ALTER TABLE pm_process_transition DROP COLUMN version_id;
ALTER TABLE pm_context_record DROP COLUMN version_id;
ALTER TABLE machine_operation_configuration DROP COLUMN process_version_id;

ALTER TABLE pm_process_node ALTER COLUMN process_id SET NOT NULL;
ALTER TABLE pm_process_transition ALTER COLUMN process_id SET NOT NULL;
ALTER TABLE pm_context_record DROP CONSTRAINT IF EXISTS pm_context_record_owner_chk;
ALTER TABLE pm_context_record ADD CONSTRAINT pm_context_record_owner_chk CHECK (process_id IS NOT NULL OR node_id IS NOT NULL);
ALTER TABLE machine_operation_configuration ADD CONSTRAINT machine_operation_configuration_unq UNIQUE (machine_id, process_id, operation_id);
ALTER TABLE pm_process_node ADD CONSTRAINT pm_process_node_process_code_unq UNIQUE (process_id, node_code);
ALTER TABLE pm_process_transition ADD CONSTRAINT pm_process_transition_unq UNIQUE (process_id, source_node_id, target_node_id, transition_type);
ALTER TABLE pm_process_node ADD CONSTRAINT pm_process_node_process_fk FOREIGN KEY (process_id) REFERENCES bpm_process(process_id) ON DELETE CASCADE;
ALTER TABLE pm_process_transition ADD CONSTRAINT pm_process_transition_process_fk FOREIGN KEY (process_id) REFERENCES bpm_process(process_id) ON DELETE CASCADE;
ALTER TABLE pm_context_record ADD CONSTRAINT pm_context_record_process_fk FOREIGN KEY (process_id) REFERENCES bpm_process(process_id) ON DELETE CASCADE;
ALTER TABLE pm_process_node DROP CONSTRAINT IF EXISTS pm_process_node_version_id_key;
DROP TABLE pm_process_version;

DROP INDEX IF EXISTS idx_pm_context_record_version;
DROP INDEX IF EXISTS idx_pm_version_process;
CREATE INDEX IF NOT EXISTS idx_pm_context_record_process ON pm_context_record(process_id);
CREATE INDEX IF NOT EXISTS idx_pm_process_node_process ON pm_process_node(process_id);
CREATE INDEX IF NOT EXISTS idx_machine_operation_configuration_operation ON machine_operation_configuration(operation_id, process_id);

COMMIT;
