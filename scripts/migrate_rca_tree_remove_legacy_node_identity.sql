-- Final cutover: all graph-node ownership is carried by entity.node_id.
ALTER TABLE node DROP CONSTRAINT IF EXISTS node_legacy_unq;
ALTER TABLE node DROP COLUMN IF EXISTS legacy_table;
ALTER TABLE node DROP COLUMN IF EXISTS legacy_id;
