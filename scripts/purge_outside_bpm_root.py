"""Keep one BPM process tree and remove unrelated local fixture data.

The operation is intentionally explicit and transactional.  It resolves the
root from a BPM version, creates the canonical process rows for the retained
tree, then removes only rows outside that closure.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import psycopg2.extras

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.postgres import get_connection


DEFAULT_VERSION_ID = "478df933-7729-4bed-adb6-8d1b2f97ae4c"


def _ensure_process_relation(cur) -> None:
    cur.execute("ALTER TABLE proceso ADD COLUMN IF NOT EXISTS bpm_process_id UUID")
    cur.execute(
        """
        DO $$
        BEGIN
            ALTER TABLE proceso ADD CONSTRAINT proceso_bpm_process_fk
                FOREIGN KEY (bpm_process_id)
                REFERENCES bpm_process(process_id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    cur.execute(
        """
        DO $$
        BEGIN
            ALTER TABLE proceso ADD CONSTRAINT proceso_bpm_process_unq UNIQUE (bpm_process_id);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )


def _build_allowed_processes(cur, version_id: str) -> str:
    cur.execute(
        """
        CREATE TEMP TABLE allowed_bpm_processes (
            process_id UUID PRIMARY KEY
        ) ON COMMIT DROP
        """
    )
    cur.execute(
        """
        INSERT INTO allowed_bpm_processes(process_id)
        SELECT process_id FROM pm_process_version WHERE version_id=%s
        """,
        (version_id,),
    )
    if cur.rowcount != 1:
        raise ValueError(f"No existe la versión BPM {version_id}")

    while True:
        cur.execute(
            """
            INSERT INTO allowed_bpm_processes(process_id)
            SELECT p.process_id
            FROM bpm_process p
            JOIN allowed_bpm_processes a ON a.process_id=p.parent_process_id
            ON CONFLICT DO NOTHING
            """
        )
        inserted_parent = cur.rowcount
        cur.execute(
            """
            INSERT INTO allowed_bpm_processes(process_id)
            SELECT DISTINCT n.child_process_id
            FROM pm_process_node n
            JOIN pm_process_version v ON v.version_id=n.version_id
            JOIN allowed_bpm_processes a ON a.process_id=v.process_id
            WHERE n.child_process_id IS NOT NULL
            ON CONFLICT DO NOTHING
            """
        )
        if inserted_parent + cur.rowcount == 0:
            break

    cur.execute(
        """
        SELECT p.process_id, p.process_code, p.name
        FROM bpm_process p
        JOIN allowed_bpm_processes a ON a.process_id=p.process_id
        ORDER BY p.process_code
        """
    )
    rows = cur.fetchall()
    if not rows:
        raise ValueError("La versión BPM no tiene un proceso asociado")
    return rows[0]["process_id"]


def _sync_canonical_processes(cur) -> None:
    cur.execute(
        """
        SELECT p.process_id, p.process_code, p.name
                  FROM bpm_process p
        JOIN allowed_bpm_processes a ON a.process_id=p.process_id
        ORDER BY p.process_code
        """
    )
    for bpm in cur.fetchall():
        cur.execute(
            "SELECT id, nombre, bpm_process_id FROM proceso WHERE bpm_process_id=%s FOR UPDATE",
            (bpm["process_id"],),
        )
        matches = cur.fetchall()
        if len(matches) > 1:
            raise ValueError(f"Más de un proceso canónico para BPM {bpm['process_id']}")
        if matches:
            canonical_id = matches[0]["id"]
        else:
            cur.execute(
                """
                SELECT id, nombre, bpm_process_id
                FROM proceso
                WHERE nombre IN (%s, %s)
                FOR UPDATE
                """,
                (f"BPM:R12_BU_FIXTURE_V1:{bpm['process_code']}", bpm["process_code"]),
            )
            legacy_matches = cur.fetchall()
            if len(legacy_matches) > 1:
                raise ValueError(f"Relación ambigua para BPM {bpm['process_code']}")
            if legacy_matches:
                canonical_id = legacy_matches[0]["id"]
                if legacy_matches[0]["bpm_process_id"] not in (None, bpm["process_id"]):
                    raise ValueError(f"El proceso {canonical_id} ya pertenece a otro BPM")
            else:
                cur.execute(
                    "INSERT INTO proceso(nombre, bpm_process_id) VALUES (%s, %s) RETURNING id",
                    (bpm["name"], bpm["process_id"]),
                )
                canonical_id = cur.fetchone()["id"]
        cur.execute(
            "UPDATE proceso SET nombre=%s, bpm_process_id=%s WHERE id=%s",
            (bpm["name"], bpm["process_id"], canonical_id),
        )


def _delete_outside_bpm(cur) -> None:
    cur.execute(
        "DELETE FROM machine_operation_configuration WHERE process_id NOT IN (SELECT process_id FROM allowed_bpm_processes)"
    )
    # Remove external BPM nodes first so child_process_id cannot block the
    # subsequent deletion of external process definitions.
    cur.execute(
        """
        DELETE FROM pm_process_node n
        USING pm_process_version v
        WHERE n.version_id=v.version_id
          AND v.process_id NOT IN (SELECT process_id FROM allowed_bpm_processes)
        """
    )
    while True:
        cur.execute(
            """
            DELETE FROM bpm_process p
            WHERE p.process_id NOT IN (SELECT process_id FROM allowed_bpm_processes)
              AND NOT EXISTS (
                  SELECT 1 FROM bpm_process child
                  WHERE child.parent_process_id=p.process_id
                    AND child.process_id NOT IN (SELECT process_id FROM allowed_bpm_processes)
              )
            """
        )
        if cur.rowcount == 0:
            break

    cur.execute(
        "SELECT process_id FROM bpm_process WHERE process_id NOT IN (SELECT process_id FROM allowed_bpm_processes)"
    )
    if cur.fetchone():
        raise ValueError("No se pudieron eliminar todas las definiciones BPM externas")

    cur.execute(
        """
        CREATE TEMP TABLE allowed_canonical_processes ON COMMIT DROP AS
        SELECT id FROM proceso WHERE bpm_process_id IN (SELECT process_id FROM allowed_bpm_processes)
        """
    )
    cur.execute(
        """
        CREATE TEMP TABLE allowed_contracts ON COMMIT DROP AS
        SELECT id FROM contrato WHERE proceso_id IN (SELECT id FROM allowed_canonical_processes)
        """
    )
    cur.execute(
        """
        DELETE FROM analisis_resultado ar
        USING analisis_causas a
        WHERE a.id=ar.analisis_id
          AND a.contrato_id NOT IN (SELECT id FROM allowed_contracts)
        """
    )
    cur.execute(
        "DELETE FROM contrato WHERE proceso_id NOT IN (SELECT id FROM allowed_canonical_processes)"
    )
    cur.execute(
        "DELETE FROM proceso WHERE bpm_process_id IS NULL OR bpm_process_id NOT IN (SELECT process_id FROM allowed_bpm_processes)"
    )

    cur.execute(
        """
        UPDATE machine_operation_configuration moc
        SET contract_id=NULL
        WHERE contract_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM contrato c WHERE c.id=moc.contract_id)
        """
    )
    cur.execute(
        """
        CREATE TEMP TABLE kept_machines ON COMMIT DROP AS
        SELECT DISTINCT m.id
        FROM maquina m
        WHERE EXISTS (SELECT 1 FROM contrato_maquina cm JOIN contrato c ON c.id=cm.contrato_id
                      WHERE cm.maquina_id=m.id AND c.proceso_id IN (SELECT id FROM allowed_canonical_processes))
           OR EXISTS (SELECT 1 FROM machine_operation_configuration moc
                      WHERE moc.machine_id=m.id AND moc.process_id IN (SELECT process_id FROM allowed_bpm_processes))
           OR EXISTS (SELECT 1 FROM maquina m2 JOIN contrato c ON c.id=m2.contract_id
                      WHERE m2.id=m.id AND c.proceso_id IN (SELECT id FROM allowed_canonical_processes))
        """
    )
    cur.execute("ALTER TABLE kept_machines ADD PRIMARY KEY (id)")
    while True:
        cur.execute(
            """
            INSERT INTO kept_machines(id)
            SELECT m.parent_maquina_id
            FROM maquina m JOIN kept_machines k ON k.id=m.id
            WHERE m.parent_maquina_id IS NOT NULL
            ON CONFLICT DO NOTHING
            """
        )
        if cur.rowcount == 0:
            break
    while True:
        cur.execute(
            """
            DELETE FROM maquina m
            WHERE m.id NOT IN (SELECT id FROM kept_machines)
              AND NOT EXISTS (SELECT 1 FROM maquina child WHERE child.parent_maquina_id=m.id)
            """
        )
        if cur.rowcount == 0:
            break
    cur.execute("DELETE FROM maquinas_tipo t WHERE NOT EXISTS (SELECT 1 FROM maquina m WHERE m.maquinas_tipo_id=t.id)")

    cur.execute(
        """
        UPDATE analisis_causas a
        SET proceso_id=c.proceso_id
        FROM contrato c
        WHERE c.id=a.contrato_id
          AND c.proceso_id IN (SELECT id FROM allowed_canonical_processes)
        """
    )
    cur.execute(
        "DELETE FROM analisis_causas WHERE contrato_id NOT IN (SELECT id FROM contrato)"
    )
    cur.execute(
        "CREATE TEMP TABLE kept_causes ON COMMIT DROP AS SELECT id FROM causa WHERE contrato_id IN (SELECT id FROM contrato)"
    )
    cur.execute("ALTER TABLE kept_causes ADD PRIMARY KEY (id)")
    while True:
        cur.execute(
            """
            INSERT INTO kept_causes(id)
            SELECT c.parent_id FROM causa c JOIN kept_causes k ON k.id=c.id
            WHERE c.parent_id IS NOT NULL
            ON CONFLICT DO NOTHING
            """
        )
        if cur.rowcount == 0:
            break
    cur.execute(
        "CREATE TEMP TABLE kept_hypotheses ON COMMIT DROP AS SELECT id FROM hipotesis WHERE causa_id IN (SELECT id FROM kept_causes)"
    )
    cur.execute(
        "DELETE FROM analisis_resultado WHERE (causa_id IS NOT NULL AND causa_id NOT IN (SELECT id FROM kept_causes)) OR (hipotesis_id IS NOT NULL AND hipotesis_id NOT IN (SELECT id FROM kept_hypotheses))"
    )
    cur.execute("DELETE FROM hipotesis WHERE id NOT IN (SELECT id FROM kept_hypotheses)")
    while True:
        cur.execute(
            """
            DELETE FROM causa c
            WHERE c.id NOT IN (SELECT id FROM kept_causes)
              AND NOT EXISTS (SELECT 1 FROM causa child WHERE child.parent_id=c.id)
            """
        )
        if cur.rowcount == 0:
            break

    cur.execute(
        """
        CREATE TEMP TABLE kept_nodes ON COMMIT DROP AS
        SELECT id FROM node
        WHERE (legacy_table='proceso' AND legacy_id IN (SELECT id FROM allowed_canonical_processes))
           OR (legacy_table='contrato' AND legacy_id IN (SELECT id FROM contrato))
           OR (legacy_table='maquina' AND legacy_id IN (SELECT id FROM kept_machines))
           OR (legacy_table='causa' AND legacy_id IN (SELECT id FROM kept_causes))
           OR (legacy_table='hipotesis' AND legacy_id IN (SELECT id FROM kept_hypotheses))
        """
    )
    cur.execute("ALTER TABLE kept_nodes ADD PRIMARY KEY (id)")
    while True:
        cur.execute(
            """
            INSERT INTO kept_nodes(id)
            SELECT r.child_node_id FROM relationship r JOIN kept_nodes k ON k.id=r.parent_node_id
            ON CONFLICT DO NOTHING
            """
        )
        if cur.rowcount == 0:
            break
    cur.execute(
        "DELETE FROM relationship WHERE parent_node_id NOT IN (SELECT id FROM kept_nodes) OR child_node_id NOT IN (SELECT id FROM kept_nodes)"
    )
    cur.execute("DELETE FROM node WHERE id NOT IN (SELECT id FROM kept_nodes)")


def _counts(cur) -> dict[str, int]:
    queries = {
        "bpm_processes": "SELECT COUNT(*) FROM bpm_process",
        "bpm_versions": "SELECT COUNT(*) FROM pm_process_version",
        "canonical_processes": "SELECT COUNT(*) FROM proceso",
        "contracts": "SELECT COUNT(*) FROM contrato",
        "machines": "SELECT COUNT(*) FROM maquina",
        "configs": "SELECT COUNT(*) FROM machine_operation_configuration",
        "nodes": "SELECT COUNT(*) FROM node",
        "relationships": "SELECT COUNT(*) FROM relationship",
        "analyses": "SELECT COUNT(*) FROM analisis_causas",
    }
    result = {}
    for key, query in queries.items():
        cur.execute(query)
        result[key] = cur.fetchone()["count"]
    return result


def purge(version_id: str) -> dict:
    conn = get_connection()
    try:
        with conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                _ensure_process_relation(cur)
                root_id = _build_allowed_processes(cur, version_id)
                _sync_canonical_processes(cur)
                before = _counts(cur)
                _delete_outside_bpm(cur)
                cur.execute("ALTER TABLE proceso ALTER COLUMN bpm_process_id SET NOT NULL")
                cur.execute(
                    "SELECT COUNT(*) FROM bpm_process WHERE process_id NOT IN (SELECT process_id FROM allowed_bpm_processes)"
                )
                if cur.fetchone()["count"] != 0:
                    raise ValueError("Quedan procesos BPM fuera de la subárbol permitida")
                cur.execute("SELECT COUNT(*) FROM proceso WHERE bpm_process_id IS NULL")
                if cur.fetchone()["count"] != 0:
                    raise ValueError("Quedan procesos canónicos sin relación BPM")
                after = _counts(cur)
                return {"root_process_id": root_id, "before": before, "after": after}
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--version-id", default=DEFAULT_VERSION_ID)
    args = parser.parse_args()
    print(json.dumps(purge(args.version_id), indent=2, sort_keys=True))
