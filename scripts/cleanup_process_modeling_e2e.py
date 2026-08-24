"""Remove one TEST_PM_E2E process created by the real Playwright smoke test."""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor

ALLOWED_TEST_PROCESS_PREFIXES = ("TEST_PM_E2E_", "TEST_PM_UI_")


def main(process_id: str) -> int:
    process_uuid = str(UUID(process_id))
    allowed_patterns = [f"{prefix}%" for prefix in ALLOWED_TEST_PROCESS_PREFIXES]
    with db_cursor() as cursor:
        cursor.execute("SELECT process_code FROM pm_process_definition WHERE process_id = %s", (process_uuid,))
        row = cursor.fetchone()
        if row is None:
            print(f"process {process_uuid} already absent (idempotent)")
            return 0
        if not any(str(row["process_code"]).startswith(prefix) for prefix in ALLOWED_TEST_PROCESS_PREFIXES):
            raise RuntimeError("cleanup rechazado: el proceso no pertenece a la allowlist TEST_PM")
        cursor.execute(
            "DELETE FROM pm_process_definition "
            "WHERE process_id = %s AND process_code LIKE ANY(%s)",
            (process_uuid, allowed_patterns),
        )
        if cursor.rowcount not in (0, 1):
            raise RuntimeError("cleanup produjo un número de borrados inesperado")
    print(f"cleaned TEST_PM_E2E process {process_uuid}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: cleanup_process_modeling_e2e.py PROCESS_UUID")
    raise SystemExit(main(sys.argv[1]))
