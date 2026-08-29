"""Explicit, transactional development reset. Never called by application startup."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.postgres import get_connection
from psycopg2 import sql


TABLES = (
    "analisis_resultado", "analisis_participante", "analisis_causas_detalle",
    "analisis_causas", "hypothesis_expected_evidence", "hypothesis_required_data",
    "hipotesis", "causa", "contrato_maquina", "registro_maquina", "maquina",
    "maquinas_tipo", "contrato", "proceso", "relationship", "node",
)


def reset_db() -> None:
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = current_schema() AND table_name = ANY(%s)",
                    (list(TABLES),),
                )
                existing = [row[0] for row in cur.fetchall()]
                if existing:
                    cur.execute(
                        sql.SQL("TRUNCATE TABLE {} RESTART IDENTITY CASCADE").format(
                            sql.SQL(", ").join(sql.Identifier(name) for name in existing)
                        )
                    )
    finally:
        conn.close()


if __name__ == "__main__":
    reset_db()
