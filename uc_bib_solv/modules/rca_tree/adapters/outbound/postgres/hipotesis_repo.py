from __future__ import annotations

import uuid
import psycopg2.extras

from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import validate_delete_allowed, validate_relationship_signature
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import graph_query_repo, graph_sync, node_repo, relationship_repo
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


_UNSET = object()


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
    title: str | None = None,
    prediction: str | None = None,
    metric: str | None = None,
    unit: str | None = None,
    data_source: str | None = None,
    method: str | None = None,
    period: str | None = None,
    calculation: str | None = None,
    threshold: str | None = None,
    evidence: str | None = None,
    decision: str | None = None,
    decision_justification: str | None = None,
    control_action: str | None = None,
    action_owner: str | None = None,
    control_date: str | None = None,
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
                    (f"HYPOTHESIS:{uuid.uuid4().hex}", (title or descripcion).strip(), descripcion.strip(),
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
                decision_rule,
                prediccion,
                metrica,
                unidad,
                fuente_datos,
                metodo,
                periodo,
                calculo,
                umbral
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                int(node["id"]),
                int(causa_id),
                (title or descripcion).strip(),
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
                prediction,
                metric,
                unit,
                data_source,
                method,
                period,
                calculation,
                threshold,
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
    rows = graph_query_repo.get_hypotheses_for_cause(int(causa_id))
    return _with_scientific_fields(rows)


def _with_scientific_fields(rows: list[dict]) -> list[dict]:
    ids = [int(row["id"]) for row in rows if row.get("id") is not None]
    if not ids:
        return rows
    placeholders = ",".join(["%s"] * len(ids))
    with db_cursor() as cur:
        cur.execute(
            f"""SELECT id, prediccion, metrica, unidad, fuente_datos, metodo,
                       periodo, calculo, umbral
                FROM hipotesis WHERE id IN ({placeholders})""",
            ids,
        )
        by_id = {int(item["id"]): dict(item) for item in cur.fetchall()}
    for row in rows:
        scientific = by_id.get(int(row["id"]))
        if scientific:
            row.update(scientific)
            row.update({
                "prediction": row.get("prediccion"),
                "metric": row.get("metrica"),
                "unit": row.get("unidad"),
                "data_source": row.get("fuente_datos"),
                "method": row.get("metodo"),
                "period": row.get("periodo"),
                "calculation": row.get("calculo"),
                "threshold": row.get("umbral"),
            })
    return rows


def get_by_id(hipotesis_id: int) -> dict | None:
    graph_sync.sync_hypothesis_graph(int(hipotesis_id))
    hypothesis = graph_query_repo.get_hypothesis_record(int(hipotesis_id))
    if not hypothesis:
        return None
    with db_cursor() as cur:
        cur.execute(
            """SELECT prediccion, metrica, unidad, fuente_datos, metodo, periodo,
                      calculo, umbral
               FROM hipotesis WHERE id=%s""",
            (int(hipotesis_id),),
        )
        scientific = cur.fetchone()
    return _with_scientific_fields([hypothesis])[0] if scientific else hypothesis


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
    title: str | None = None,
    prediction: str | None = None,
    metric: str | None = None,
    unit: str | None = None,
    data_source: str | None = None,
    method: str | None | object = _UNSET,
    period: str | None = None,
    calculation: str | None = None,
    threshold: str | None = None,
    evidence: str | None = None,
    decision: str | None = None,
    decision_justification: str | None = None,
    control_action: str | None = None,
    action_owner: str | None = None,
    control_date: str | None = None,
) -> dict:
    if not descripcion or not descripcion.strip():
        raise ValueError("La descripción de la hipótesis es obligatoria.")
    current = get_by_id(int(hipotesis_id))
    if not current:
        raise ValueError("Hipótesis no encontrada.")

    with db_cursor() as cur:
        assignments = ["nombre=%s", "descripcion=%s", "criterio_validacion=%s"]
        params = [(title or descripcion).strip(), descripcion.strip(), criterio_validacion]
        if method is not _UNSET:
            assignments.append("metodo=%s")
            params.append(method)
        params.append(hipotesis_id)
        cur.execute(
            f"""UPDATE hipotesis SET {', '.join(assignments)}, updated_at=NOW()
                WHERE id=%s RETURNING id""",
            tuple(params),
        )
        if not cur.fetchone():
            raise ValueError("Hipótesis no encontrada.")
        # Entity, node, KPI synchronization, and collection replacement are
        # all committed together; a failed write rolls back the entity too.
        if current.get("node_id") is not None:
            cur.execute("""UPDATE node SET name=%s, description=%s, updated_at=NOW() WHERE id=%s""",
                        ((title or descripcion).strip(), descripcion.strip(),
                         int(current["node_id"])))
            if required_data is not None or expected_evidence is not None:
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
