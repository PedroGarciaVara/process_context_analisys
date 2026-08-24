from __future__ import annotations

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
) -> dict:
    if not descripcion or not descripcion.strip():
        raise ValueError("La descripción de la hipótesis es obligatoria.")

    cause_node = node_repo.get_by_legacy_ref("causa", int(causa_id)) or graph_sync.sync_causa_graph(int(causa_id))
    if not cause_node:
        raise ValueError("La causa indicada no existe.")
    validate_relationship_signature("CAUSE", "HYPOTHESIS", "VERIFIED_BY")

    node = node_repo.create(
        "HYPOTHESIS",
        descripcion.strip(),
        description=criterio_validacion,
        status=estado,
        metadata={
            "source": "app",
            "legacy_tipo": tipo,
        },
    )
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO hipotesis(
                node_id,
                causa_id,
                descripcion,
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
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                int(node["id"]),
                int(causa_id),
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
            ),
        )
        hipotesis_id = int(cur.fetchone()["id"])
        cur.execute(
            """
            UPDATE node
            SET legacy_table='hipotesis', legacy_id=%s, updated_at=NOW()
            WHERE id=%s
            """,
            (hipotesis_id, int(node["id"])),
        )
    relationship_repo.create(
        int(cause_node["id"]),
        int(node["id"]),
        "VERIFIED_BY",
        metadata={"source": "app", "legacy_cause_id": causa_id},
        is_primary=True,
    )
    _replace_collection("hypothesis_required_data", int(node["id"]), required_data or [])
    _replace_collection("hypothesis_expected_evidence", int(node["id"]), expected_evidence or [])
    return get_by_id(hipotesis_id) or {"id": hipotesis_id, "node_id": node["id"]}


def get_by_causa(causa_id: int) -> list[dict]:
    graph_sync.sync_causa_graph(int(causa_id))
    return graph_query_repo.get_hypotheses_for_cause(int(causa_id))


def get_by_id(hipotesis_id: int) -> dict | None:
    graph_sync.sync_hypothesis_graph(int(hipotesis_id))
    return graph_query_repo.get_hypothesis_record(int(hipotesis_id))


def update_estado(hipotesis_id: int, estado: str) -> dict:
    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE hipotesis
            SET estado=%s, updated_at=NOW()
            WHERE id=%s
            RETURNING id
            """,
            (estado, hipotesis_id),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Hipótesis no encontrada.")
    hypothesis = get_by_id(int(hipotesis_id))
    if hypothesis and hypothesis.get("node_id") is not None:
        node_repo.update(int(hypothesis["node_id"]), status=estado)
    return get_by_id(int(hipotesis_id)) or {"id": int(hipotesis_id), "estado": estado}


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
                updated_at=NOW()
            WHERE id=%s
            RETURNING id
            """,
            (
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
                hipotesis_id,
            ),
        )
        if not cur.fetchone():
            raise ValueError("Hipótesis no encontrada.")

    if current.get("node_id") is not None:
        node_repo.update(
            int(current["node_id"]),
            name=descripcion.strip(),
            description=criterio_validacion,
            status=estado,
            metadata={
                **(current.get("metadata") or {}),
                "legacy_tipo": tipo,
            },
        )
        _replace_collection("hypothesis_required_data", int(current["node_id"]), required_data or [])
        _replace_collection("hypothesis_expected_evidence", int(current["node_id"]), expected_evidence or [])
    return get_by_id(int(hipotesis_id)) or current


def delete(hipotesis_id: int) -> bool:
    graph_sync.sync_hypothesis_graph(int(hipotesis_id))
    node = node_repo.get_by_legacy_ref("hipotesis", int(hipotesis_id))
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
