"""Reproducible PostgreSQL scenario for the Java application workflow."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor, get_connection
from db_management.init_db import init_db
import time
import uuid


def _node(cur, node_type: str, code: str, name: str, legacy_table: str, legacy_id: int) -> int:
    cur.execute(
        """
        INSERT INTO node(node_type, code, name, description, metadata)
        VALUES (%s, %s, %s, %s, %s::jsonb)
        RETURNING id
        """,
        (node_type, code, name, name, '{"legacy_table": "%s", "legacy_id": %s}' % (legacy_table, legacy_id)),
    )
    return int(cur.fetchone()["id"])


def build_fixture() -> dict[str, int | str]:
    init_db()
    stamp = int(time.time() * 1000)
    prefix = f"TEST_REQ16_JAVA_{stamp}"
    with db_cursor() as cur:
        bpm_process_id = str(uuid.uuid4())
        operation_id = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO bpm_process(process_id, process_code, name, status)
               VALUES (%s, %s, %s, 'draft')""",
            (bpm_process_id, f"{prefix}_BPM", f"{prefix} BPM"),
        )
        cur.execute(
            """INSERT INTO pm_process_node(node_id, process_id, node_code, node_type, name)
               VALUES (%s, %s, %s, 'operation', %s)""",
            (operation_id, bpm_process_id, f"{prefix}_OP", f"{prefix} operation"),
        )
        cur.execute("INSERT INTO proceso(nombre, bpm_process_id) VALUES (%s, %s) RETURNING id", (f"{prefix}_PROCESS", bpm_process_id))
        process_id = int(cur.fetchone()["id"])
        cur.execute("INSERT INTO maquinas_tipo(nombre, descripcion) VALUES (%s, %s) RETURNING id", (f"{prefix}_TYPE", "Tipo de prueba"))
        machine_type_id = int(cur.fetchone()["id"])
        cur.execute(
            "INSERT INTO maquina(nombre, maquinas_tipo_id) VALUES (%s, %s) RETURNING id",
            (f"{prefix}_MACHINE", machine_type_id),
        )
        machine_id = int(cur.fetchone()["id"])
        cur.execute(
            "INSERT INTO registro_maquina(maquina_id, codigo, numero_serie) VALUES (%s, %s, %s)",
            (machine_id, f"{prefix}_FIX-JAVA-001", f"{prefix}_SERIE-FIX-001"),
        )
        cur.execute(
            """INSERT INTO contrato(proceso_id, bpm_node_id, nombre, kpi_description, kpi_args, kpi_function, objetivo)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (process_id, operation_id, f"{prefix}_CONTRACT", "OEE", "", "", "Validar trazabilidad"),
        )
        contract_id = int(cur.fetchone()["id"])
        cur.execute("INSERT INTO contrato_maquina(contrato_id, maquina_id) VALUES (%s, %s)", (contract_id, machine_id))

        contract_node_id = _node(cur, "CONTRACT", f"{prefix}_CONTRACT_NODE", f"{prefix}_CONTRACT", "contrato", contract_id)
        causes: list[tuple[int, int, int]] = []
        level_parents: list[int | None] = [None]
        for level, count in ((1, 1), (2, 3), (3, 5)):
            next_parents: list[int] = []
            for index in range(count):
                parent_id = level_parents[index % len(level_parents)] if level > 1 else None
                name = f"Causa fixture nivel {level}-{index + 1}"
                cur.execute(
                    """
                    INSERT INTO causa(contrato_id, parent_id, nombre, descripcion, tipo, categoria)
                    VALUES (%s, %s, %s, %s, 'causa', 'fixture')
                    RETURNING id
                    """,
                    (contract_id, parent_id, name, "Causa creada por fixture Java"),
                )
                cause_id = int(cur.fetchone()["id"])
                node_id = _node(cur, "CAUSE", f"CAUSE-FIX-{cause_id:03d}", name, "causa", cause_id)
                cur.execute("UPDATE causa SET node_id=%s WHERE id=%s", (node_id, cause_id))
                if parent_id is None:
                    cur.execute(
                        "INSERT INTO relationship(parent_node_id, child_node_id, relationship_type) VALUES (%s, %s, 'DEPENDS_ON')",
                        (contract_node_id, node_id),
                    )
                else:
                    cur.execute("SELECT node_id FROM causa WHERE id=%s", (parent_id,))
                    parent_node_id = int(cur.fetchone()["node_id"])
                    cur.execute(
                        "INSERT INTO relationship(parent_node_id, child_node_id, relationship_type) VALUES (%s, %s, 'CAUSES')",
                        (parent_node_id, node_id),
                    )
                cur.execute(
                    """
                    INSERT INTO hipotesis(causa_id, nombre, descripcion, criterio_validacion, estado)
                    VALUES (%s, %s, %s, %s, 'pendiente')
                    RETURNING id
                    """,
                    (cause_id, f"Hipotesis para {name}", f"Hipotesis para {name}", "Comprobar evidencia fixture"),
                )
                hypothesis_id = int(cur.fetchone()["id"])
                hypothesis_node_id = _node(
                    cur,
                    "HYPOTHESIS",
                    f"HYP-FIX-{hypothesis_id:03d}",
                    f"Hipotesis para {name}",
                    "hipotesis",
                    hypothesis_id,
                )
                cur.execute("UPDATE hipotesis SET node_id=%s WHERE id=%s", (hypothesis_node_id, hypothesis_id))
                cur.execute(
                    "INSERT INTO relationship(parent_node_id, child_node_id, relationship_type) VALUES (%s, %s, 'VERIFIED_BY')",
                    (node_id, hypothesis_node_id),
                )
                causes.append((cause_id, hypothesis_id, node_id))
                next_parents.append(cause_id)
            level_parents = next_parents

        cur.execute(
            """
            INSERT INTO analisis_causas(contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
            """,
            (contract_id, process_id, machine_id, "Fixture Java", "Validar trazabilidad del arbol completo"),
        )
        analysis_id = int(cur.fetchone()["id"])
        for participant in ("Ana", "Luis"):
            cur.execute("INSERT INTO analisis_participante(analisis_id, participante) VALUES (%s, %s)", (analysis_id, participant))
        for cause_id, hypothesis_id, _node_id in causes:
            cur.execute(
                "INSERT INTO analisis_resultado(analisis_id, tipo_elemento, causa_id, evidencia, conclusion) VALUES (%s, 'causa', %s, %s, %s)",
                (analysis_id, cause_id, "Evidencia de causa fixture", "Conclusion de causa fixture"),
            )
            cur.execute(
                """
                INSERT INTO analisis_resultado(analisis_id, tipo_elemento, hipotesis_id, evidencia, conclusion, evaluacion)
                VALUES (%s, 'hipotesis', %s, %s, %s, 'validada')
                """,
                (analysis_id, hypothesis_id, "Evidencia de hipotesis fixture", "Conclusion de hipotesis fixture"),
            )
        cur.execute("SELECT COUNT(*) AS count FROM causa WHERE contrato_id=%s", (contract_id,))
        assert int(cur.fetchone()["count"]) == 9
        cur.execute("SELECT COUNT(*) AS count FROM analisis_resultado WHERE analisis_id=%s AND tipo_elemento='hipotesis'", (analysis_id,))
        assert int(cur.fetchone()["count"]) == 9
        cur.execute("SELECT COUNT(*) AS count FROM analisis_resultado WHERE analisis_id=%s AND evidencia IS NOT NULL AND conclusion IS NOT NULL", (analysis_id,))
        assert int(cur.fetchone()["count"]) == 18
    return {"process_id": process_id, "machine_id": machine_id, "contract_id": contract_id, "analysis_id": analysis_id, "prefix": prefix, "cause_count": 9, "hypothesis_count": 9}


if __name__ == "__main__":
    print(build_fixture())
