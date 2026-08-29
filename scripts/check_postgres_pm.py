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
    "bpm_process",
    "pm_process_node",
    "pm_process_transition",
}


def _check_final_schema(cursor) -> list[str]:
    problems = []
    cursor.execute("SELECT to_regclass('public.pm_process_version')")
    if cursor.fetchone()[0] is not None:
        problems.append("pm_process_version presente")
    cursor.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = 'node' "
        "AND column_name IN ('legacy_table', 'legacy_id')"
    )
    legacy_columns = [row[0] for row in cursor.fetchall()]
    if legacy_columns:
        problems.append(f"columnas legacy en node: {','.join(legacy_columns)}")
    for table in ("proceso", "contrato", "maquina"):
        cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE node_id IS NULL")
        missing = cursor.fetchone()[0]
        if missing:
            problems.append(f"{table} sin node_id: {missing}")
    cursor.execute(
        "SELECT COUNT(*) FROM (SELECT node_id FROM ("
        "SELECT node_id FROM proceso WHERE node_id IS NOT NULL "
        "UNION ALL SELECT node_id FROM contrato WHERE node_id IS NOT NULL "
        "UNION ALL SELECT node_id FROM maquina WHERE node_id IS NOT NULL "
        "UNION ALL SELECT node_id FROM causa WHERE node_id IS NOT NULL "
        "UNION ALL SELECT node_id FROM hipotesis WHERE node_id IS NOT NULL"
        ") owners GROUP BY node_id HAVING COUNT(*) > 1) duplicates"
    )
    duplicates = cursor.fetchone()[0]
    if duplicates:
        problems.append(f"ownership duplicado: {duplicates}")
    return problems


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
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name = 'bpm_process' OR table_name LIKE 'pm_%')")
            tables = {row[0] for row in cursor.fetchall()}
            final_problems = _check_final_schema(cursor)
        missing = EXPECTED_TABLES - tables
        print(f"postgresql: connected database={database} user={user}")
        print(f"pm_schema: tables={','.join(sorted(tables & EXPECTED_TABLES))}")
        if missing:
            print(f"pm_schema: missing={','.join(sorted(missing))}", file=sys.stderr)
            return 1
        if final_problems:
            print(f"final_schema: invalid={'; '.join(final_problems)}", file=sys.stderr)
            return 1
        print("final_schema: mutable process model and canonical node ownership OK")
        print("pm_schema: OK")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
