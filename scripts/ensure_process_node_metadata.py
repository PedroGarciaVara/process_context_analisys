"""Create the process-node metadata table idempotently."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


DDL = """
CREATE TABLE IF NOT EXISTS pm_process_node_metadata (
    metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL UNIQUE REFERENCES pm_process_node(node_id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pm_node_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_pm_node_metadata_node ON pm_process_node_metadata(node_id);
"""


def main():
    with db_cursor() as cursor:
        cursor.execute(DDL)
    print("pm_process_node_metadata ready")


if __name__ == "__main__":
    main()
