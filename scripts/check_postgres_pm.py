"""Check the configured PostgreSQL connection and the idempotent pm_* schema."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.postgres import get_connection  # noqa: E402

EXPECTED_TABLES = {
    "pm_process_definition",
    "pm_process_version",
    "pm_process_node",
    "pm_process_transition",
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply-schema", action="store_true", help="run db_management/schema.sql before checking pm_* tables")
    args = parser.parse_args()

    conn = get_connection()
    try:
        if args.apply_schema:
            schema = (ROOT / "db" / "schema.sql").read_text(encoding="utf-8")
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(schema)
        with conn.cursor() as cursor:
            cursor.execute("SELECT current_database(), current_user")
            database, user = cursor.fetchone()
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'pm_%'")
            tables = {row[0] for row in cursor.fetchall()}
        missing = EXPECTED_TABLES - tables
        print(f"postgresql: connected database={database} user={user}")
        print(f"pm_schema: tables={','.join(sorted(tables & EXPECTED_TABLES))}")
        if missing:
            print(f"pm_schema: missing={','.join(sorted(missing))}", file=sys.stderr)
            return 1
        print("pm_schema: OK")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
