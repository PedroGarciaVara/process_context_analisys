from __future__ import annotations

import uuid
import psycopg2.extras

from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import validate_delete_allowed, validate_relationship_signature
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import graph_query_repo, graph_sync, node_repo, relationship_repo
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


def _replace_collection(table_name: str, node_id: int, values: list[str]) -> None:
    with db_cursor() as cur:
        cur.execute(f"DELETE FROM {table_name} WHERE hypothesis_node_id=%s", (node_id,))
        for position, value in enumerate(values):
            if not value or not str(value).strip():
                continue
            cur.execute(
                f"""
                INSERT INTO {table_name}(hypothesis_node_id, position, value)
                VALUES (%s, %s, %s)
                """,
                (node_id, position, str(value).strip()),
            )


def create(
    causa_id: int,
    descripcion: str,
    tipo: str = "aceptacion",
    criterio_validacion: str | None = None,
    estado: str = "pendiente",
    *,
    business_reason: str | None = None,
    analysis_method: str | None = None,
    expected_result: str | None = None,
    industrial_process: str | None = None,
    industrial_machine: str | None = None,
    industrial_asset: str | None = None,
    analysis_window: str | None = None,
    decision_rule: str | None = None,
    required_data: list[str] | None = None,
    expected_evidence: list[str] | None = None,
    kpi_args: str = "",
    kpi_function: str = "",
) -> dict:
    if not descripcion or not descripcion.strip():
        raise ValueError("La descripción de la hipótesis es obligatoria.")

    cause_node = node_repo.get_for_cause(int(causa_id)) or graph_sync.sync_causa_graph(int(causa_id))
    if not cause_node:
        raise ValueError("La causa indicada no existe.")
    validate_relationship_signature("CAUSE", "HYPOTHESIS", "HAS_HYPOTHESIS")

    with db_cursor() as cur:
        cur.execute("""INSERT INTO node(node_type, code, name, description, status, metadata)
                       VALUES ('HYPOTHESIS', %s, %s, %s, %s, %s)
                       RETURNING id, node_type, code, name, description, status, metadata""",
                    (f"HYPOTHESIS:{uuid.uuid4().hex}", descripcion.strip(), criterio_validacion,
                     estado, psycopg2.extras.Json({"source": "app", "type": tipo})))
        node = dict(cur.fetchone())
        cur.execute(
            """
            INSERT INTO hipotesis(
                node_id,
                causa_id,
                nombre,
                descripcion,
                kpi_args,
                kpi_function,
                tipo,
                criterio_validacion,
                estado,
                business_reason,
                analysis_method,
                expected_result,
                industrial_process,
                industrial_machine,
                industrial_asset,
                analysis_window,
                decision_rule
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                int(node["id"]),
                int(causa_id),
                descripcion.strip(),
                descripcion.strip(),
                kpi_args,
                kpi_function,
                tipo,
                criterio_validacion,
                estado,
                business_reason,
                analysis_method,
                expected_result,
                industrial_process,
                industrial_machine,
                industrial_asset,
                analysis_window,
                decision_rule,
            ),
        )
        hipotesis_id = int(cur.fetchone()["id"])
        cur.execute("""INSERT INTO relationship(parent_node_id, child_node_id, relationship_type, metadata, is_primary)
                       VALUES (%s, %s, 'HAS_HYPOTHESIS', %s, TRUE)
                       ON CONFLICT (parent_node_id, child_node_id, relationship_type)
                       DO UPDATE SET is_primary=TRUE, updated_at=NOW()""",
                    (int(cause_node["id"]), int(node["id"]), psycopg2.extras.Json({"source": "app"})))
        for table_name, values in (("hypothesis_required_data", required_data or []),
                                   ("hypothesis_expected_evidence", expected_evidence or [])):
            for position, value in enumerate(values):
                if value and str(value).strip():
                    cur.execute(f"INSERT INTO {table_name}(hypothesis_node_id, position, value) VALUES (%s,%s,%s)",
                                (int(node["id"]), position, str(value).strip()))
    return get_by_id(hipotesis_id) or {"id": hipotesis_id, "node_id": node["id"]}


def get_by_causa(causa_id: int) -> list[dict]:
    graph_sync.sync_causa_graph(int(causa_id))
    return graph_query_repo.get_hypotheses_for_cause(int(causa_id))


def get_by_id(hipotesis_id: int) -> dict | None:
    graph_sync.sync_hypothesis_graph(int(hipotesis_id))
    return graph_query_repo.get_hypothesis_record(int(hipotesis_id))


def update_status(hypothesis_id: int, status: str) -> dict:
    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE hipotesis
            SET estado=%s, updated_at=NOW()
            WHERE id=%s
            RETURNING id
            """,
            (status, hypothesis_id),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Hipótesis no encontrada.")
    hypothesis = get_by_id(int(hypothesis_id))
    if hypothesis and hypothesis.get("node_id") is not None:
        node_repo.update(int(hypothesis["node_id"]), status=status)
    return get_by_id(int(hypothesis_id)) or {"id": int(hypothesis_id), "estado": status}


def update(
    hipotesis_id: int,
    descripcion: str,
    tipo: str,
    criterio_validacion: str | None,
    estado: str,
    *,
    business_reason: str | None = None,
    analysis_method: str | None = None,
    expected_result: str | None = None,
    industrial_process: str | None = None,
    industrial_machine: str | None = None,
    industrial_asset: str | None = None,
    analysis_window: str | None = None,
    decision_rule: str | None = None,
    required_data: list[str] | None = None,
    expected_evidence: list[str] | None = None,
    kpi_args: str = "",
    kpi_function: str = "",
) -> dict:
    if not descripcion or not descripcion.strip():
        raise ValueError("La descripción de la hipótesis es obligatoria.")
    current = get_by_id(int(hipotesis_id))
    if not current:
        raise ValueError("Hipótesis no encontrada.")

    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE hipotesis
            SET
                nombre=%s,
                descripcion=%s,
                tipo=%s,
                criterio_validacion=%s,
                estado=%s,
                business_reason=%s,
                analysis_method=%s,
                expected_result=%s,
                industrial_process=%s,
                industrial_machine=%s,
                industrial_asset=%s,
                analysis_window=%s,
                decision_rule=%s,
                kpi_args=%s,
                kpi_function=%s,
                updated_at=NOW()
            WHERE id=%s
            RETURNING id
            """,
            (
                descripcion.strip(),
                descripcion.strip(),
                tipo,
                criterio_validacion,
                estado,
                business_reason,
                analysis_method,
                expected_result,
                industrial_process,
                industrial_machine,
                industrial_asset,
                analysis_window,
                decision_rule,
                kpi_args,
                kpi_function,
                hipotesis_id,
            ),
        )
        if not cur.fetchone():
            raise ValueError("Hipótesis no encontrada.")
        if current.get("is_initial_template"):
            cur.execute(
                """UPDATE contrato SET kpi_description=%s, kpi_args=%s, kpi_function=%s
                   WHERE id=(SELECT c.contrato_id FROM causa c WHERE c.id=%s)""",
                (descripcion.strip(), kpi_args, kpi_function, current["causa_id"]),
            )
        # Entity, node, KPI synchronization, and collection replacement are
        # all committed together; a failed write rolls back the entity too.
        if current.get("node_id") is not None:
            cur.execute("""UPDATE node SET name=%s, description=%s, status=%s,
                           metadata=%s, updated_at=NOW() WHERE id=%s""",
                        (descripcion.strip(), criterio_validacion, estado,
                         psycopg2.extras.Json({**(current.get("metadata") or {}), "type": tipo}),
                         int(current["node_id"])))
            for table_name, values in (("hypothesis_required_data", required_data or []),
                                       ("hypothesis_expected_evidence", expected_evidence or [])):
                cur.execute(f"DELETE FROM {table_name} WHERE hypothesis_node_id=%s", (int(current["node_id"]),))
                for position, value in enumerate(values):
                    if value and str(value).strip():
                        cur.execute(f"INSERT INTO {table_name}(hypothesis_node_id, position, value) VALUES (%s,%s,%s)",
                                    (int(current["node_id"]), position, str(value).strip()))
    return get_by_id(int(hipotesis_id)) or current


def delete(hipotesis_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute("SELECT is_initial_template FROM hipotesis WHERE id=%s", (hipotesis_id,))
        row = cur.fetchone()
    if row and row.get("is_initial_template"):
        raise ValueError("La hipótesis inicial del contrato está protegida contra borrado.")
    graph_sync.sync_hypothesis_graph(int(hipotesis_id))
    node = node_repo.get_for_hypothesis(int(hipotesis_id))
    if not node:
        with db_cursor() as cur:
            cur.execute("DELETE FROM hipotesis WHERE id=%s", (hipotesis_id,))
            return cur.rowcount > 0

    validate_delete_allowed(
        incoming_relationships=graph_query_repo.get_incoming_relationship_count(int(node["id"])),
        outgoing_relationships=graph_query_repo.get_outgoing_dependency_count(int(node["id"])),
        analysis_references=graph_query_repo.get_analysis_reference_count(int(node["id"])),
    )
    with db_cursor() as cur:
        cur.execute("DELETE FROM hipotesis WHERE id=%s", (hipotesis_id,))
    node_repo.delete(int(node["id"]))
    return True
