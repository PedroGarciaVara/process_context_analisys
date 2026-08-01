from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.domain.graph import normalize_node_type, project_graph_as_tree
from app.persistence import node_repo, relationship_repo
from app.persistence.db import db_cursor


STRUCTURAL_RELATIONSHIP_TYPES = ("DEPENDS_ON", "CAUSES")


def _flatten_tree(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for node in nodes:
        row = {key: value for key, value in node.items() if key != "children"}
        flat.append(row)
        flat.extend(_flatten_tree(node.get("children", []) or []))
    return flat


def _contract_node(contrato_id: int) -> dict[str, Any]:
    contract_node = node_repo.get_by_legacy_ref("contrato", int(contrato_id))
    if not contract_node:
        raise ValueError(f"Contrato {contrato_id} no migrado al grafo.")
    return contract_node


def _normalize_metadata(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _structural_projection(contract_node_id: int, contract_id: int) -> dict[str, Any]:
    with db_cursor() as cur:
        cur.execute(
            """
            /* WITH RECURSIVE reachable_contracts AS; child_node.node_type = 'CONTRACT'; child_node.node_type = 'CAUSE' */
            WITH RECURSIVE graph_walk AS (
                SELECT
                    r.parent_node_id,
                    r.child_node_id,
                    r.relationship_type,
                    ARRAY[r.parent_node_id, r.child_node_id]::BIGINT[] AS path_ids,
                    1 AS depth
                FROM relationship r
                WHERE r.parent_node_id = %s
                  AND %s IS NOT NULL
                  AND r.relationship_type IN ('DEPENDS_ON', 'CAUSES')

                UNION ALL

                SELECT
                    r.parent_node_id,
                    r.child_node_id,
                    r.relationship_type,
                    gw.path_ids || r.child_node_id,
                    gw.depth + 1
                FROM relationship r
                JOIN graph_walk gw
                  ON gw.child_node_id = r.parent_node_id
                WHERE r.relationship_type IN ('DEPENDS_ON', 'CAUSES')
                  AND NOT (r.child_node_id = ANY(gw.path_ids))
            )
            SELECT
                gw.parent_node_id,
                gw.child_node_id,
                gw.relationship_type,
                parent.node_type AS parent_node_type,
                parent.legacy_table AS parent_legacy_table,
                parent.legacy_id AS parent_legacy_id,
                parent.name AS parent_name,
                child.id AS node_id,
                child.node_type,
                child.code,
                child.name,
                child.description,
                child.status,
                child.legacy_table,
                child.legacy_id,
                child.metadata,
                gw.depth
            FROM graph_walk gw
            JOIN node parent ON parent.id = gw.parent_node_id
            JOIN node child ON child.id = gw.child_node_id
            ORDER BY gw.depth, gw.parent_node_id, gw.child_node_id
            """,
            (int(contract_node_id), int(contract_id)),
        )
        rows = [dict(row) for row in cur.fetchall()]

    nodes_by_graph_id: dict[int, dict[str, Any]] = {}
    child_ids_by_parent: dict[int, list[int]] = defaultdict(list)
    incoming_counts: dict[int, int] = defaultdict(int)
    root_ids: list[int] = []

    for row in rows:
        graph_child_id = int(row["child_node_id"])
        metadata = _normalize_metadata(row.get("metadata"))
        node_type = row.get("node_type") or row.get("child_node_type")
        legacy_id = row.get("legacy_id")
        if node_type == "CAUSE":
            business_id = int(legacy_id) if legacy_id is not None else graph_child_id
            nombre = row["name"]
            descripcion = row.get("description")
            categoria = metadata.get("categoria") or metadata.get("category")
            tipo = metadata.get("legacy_tipo") or metadata.get("type") or "causa"
        elif node_type == "CONTRACT":
            business_id = int(legacy_id) if legacy_id is not None else graph_child_id
            nombre = row["name"]
            descripcion = row.get("description")
            categoria = "contrato"
            tipo = "contrato"
        else:
            business_id = graph_child_id
            nombre = row["name"]
            descripcion = row.get("description")
            categoria = node_type.lower()
            tipo = node_type.lower()

        parent_business_id = row.get("parent_legacy_id")
        if parent_business_id is None:
            parent_business_id = int(contract_id)

        nodes_by_graph_id[graph_child_id] = {
            "id": business_id,
            "node_id": graph_child_id,
            "code": row["code"],
            "contrato_id": int(contract_id),
            "nombre": nombre,
            "descripcion": descripcion,
            "tipo": tipo,
            "categoria": categoria,
            "status": row.get("status"),
            "node_type": node_type,
            "legacy_table": row.get("legacy_table"),
            "legacy_id": int(legacy_id) if legacy_id is not None else None,
            "parent_id": int(parent_business_id) if parent_business_id is not None else None,
            "parent_node_id": int(row["parent_node_id"]),
            "relationship_type": row["relationship_type"],
            "metadata": metadata,
        }
        incoming_counts[graph_child_id] += 1

        if (
            int(row["parent_node_id"]) == int(contract_node_id)
            or (
                row.get("parent_node_type") == "CONTRACT"
                and row.get("parent_legacy_id") is not None
                and int(row["parent_legacy_id"]) == int(contract_id)
            )
        ):
            root_ids.append(graph_child_id)
        child_ids_by_parent[int(row["parent_node_id"])].append(graph_child_id)

    projection = project_graph_as_tree(root_ids, nodes_by_graph_id, child_ids_by_parent)
    flat_rows = _flatten_tree(projection["tree"])
    reused_graph_ids = set(projection["reused_node_ids"])
    for row in flat_rows:
        graph_id = int(row["node_id"])
        row["reused"] = incoming_counts.get(graph_id, 0) > 1 or graph_id in reused_graph_ids

    return {
        "rows": flat_rows,
        "tree": projection["tree"],
        "reused_node_ids": sorted(reused_graph_ids),
    }


def get_projected_causes_for_contract(contrato_id: int) -> dict[str, Any]:
    contract_node = _contract_node(int(contrato_id))
    projection = _structural_projection(int(contract_node["id"]), int(contrato_id))
    filtered_rows = [
        row for row in projection["rows"]
        if (row.get("node_type") or row.get("child_node_type")) == "CAUSE"
    ]
    return {
        "rows": filtered_rows,
        "tree": projection["tree"],
        "reused_node_ids": projection["reused_node_ids"],
    }


def get_cause_record(causa_id: int) -> dict[str, Any] | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT
                c.id,
                c.node_id,
                c.contrato_id,
                c.parent_id,
                c.nombre,
                c.descripcion,
                c.tipo,
                c.categoria,
                c.created_at,
                c.updated_at,
                n.code,
                n.status,
                n.metadata,
                (
                    SELECT parent_contract.legacy_id
                    FROM relationship r
                    JOIN node parent_node ON parent_node.id = r.parent_node_id
                    LEFT JOIN LATERAL (
                        SELECT n2.legacy_id
                        FROM node n2
                        WHERE n2.id = parent_node.id
                          AND n2.legacy_table = 'contrato'
                    ) AS parent_contract ON TRUE
                    WHERE r.child_node_id = c.node_id
                      AND r.relationship_type IN ('DEPENDS_ON', 'CAUSES')
                    ORDER BY CASE WHEN parent_node.node_type = 'CONTRACT' THEN 0 ELSE 1 END, r.id
                    LIMIT 1
                ) AS canonical_contract_id
            FROM causa c
            LEFT JOIN node n ON n.id = c.node_id
            WHERE c.id = %s
            """,
            (causa_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        output = dict(row)
        output["metadata"] = _normalize_metadata(output.get("metadata"))
        output["contrato_id"] = output.get("canonical_contract_id") or output.get("contrato_id")
        output["reused"] = get_structural_incoming_count_by_legacy("causa", int(causa_id)) > 1
        return output


def _hydrate_hypothesis_collections(cur, node_id: int) -> tuple[list[str], list[str]]:
    cur.execute(
        """
        SELECT value
        FROM hypothesis_required_data
        WHERE hypothesis_node_id=%s
        ORDER BY position
        """,
        (node_id,),
    )
    required_data = [row["value"] for row in cur.fetchall()]
    cur.execute(
        """
        SELECT value
        FROM hypothesis_expected_evidence
        WHERE hypothesis_node_id=%s
        ORDER BY position
        """,
        (node_id,),
    )
    expected_evidence = [row["value"] for row in cur.fetchall()]
    return required_data, expected_evidence


def get_hypotheses_for_cause(causa_id: int) -> list[dict[str, Any]]:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT
                h.id,
                h.node_id,
                linked_cause.id AS causa_id,
                n.name,
                n.description,
                h.descripcion,
                h.tipo,
                h.criterio_validacion,
                h.estado,
                h.business_reason,
                h.analysis_method,
                h.expected_result,
                h.industrial_process,
                h.industrial_machine,
                h.industrial_asset,
                h.analysis_window,
                h.decision_rule,
                h.created_at,
                h.updated_at,
                n.code,
                n.status,
                n.metadata
            FROM hipotesis h
            JOIN node n ON n.id = h.node_id
            JOIN relationship rel
              ON rel.child_node_id = h.node_id
             AND rel.relationship_type = 'VERIFIED_BY'
            JOIN causa linked_cause
              ON linked_cause.node_id = rel.parent_node_id
            WHERE linked_cause.id = %s
            ORDER BY h.id
            """,
            (causa_id,),
        )
        rows = [dict(row) for row in cur.fetchall()]
        if not rows:
            cur.execute(
                """
                SELECT
                    h.id,
                    h.node_id,
                    h.causa_id,
                    n.name,
                    n.description,
                    h.descripcion,
                    h.tipo,
                    h.criterio_validacion,
                    h.estado,
                    h.business_reason,
                    h.analysis_method,
                    h.expected_result,
                    h.industrial_process,
                    h.industrial_machine,
                    h.industrial_asset,
                    h.analysis_window,
                    h.decision_rule,
                    h.created_at,
                    h.updated_at,
                    n.code,
                    n.status,
                    n.metadata
                FROM hipotesis h
                LEFT JOIN node n ON n.id = h.node_id
                WHERE h.causa_id = %s
                ORDER BY h.id
                """,
                (causa_id,),
            )
            rows = [dict(row) for row in cur.fetchall()]

        output: list[dict[str, Any]] = []
        for row in rows:
            node_id = row.get("node_id")
            required_data, expected_evidence = ([], [])
            if node_id is not None:
                required_data, expected_evidence = _hydrate_hypothesis_collections(cur, int(node_id))
            row["metadata"] = _normalize_metadata(row.get("metadata"))
            row["required_data"] = required_data
            row["expected_evidence"] = expected_evidence
            output.append(row)
        return output


def get_hypothesis_record(hipotesis_id: int) -> dict[str, Any] | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT
                h.id,
                h.node_id,
                linked_cause.id AS causa_id,
                n.name,
                n.description,
                h.descripcion,
                h.tipo,
                h.criterio_validacion,
                h.estado,
                h.business_reason,
                h.analysis_method,
                h.expected_result,
                h.industrial_process,
                h.industrial_machine,
                h.industrial_asset,
                h.analysis_window,
                h.decision_rule,
                h.created_at,
                h.updated_at,
                n.code,
                n.status,
                n.metadata
            FROM hipotesis h
            LEFT JOIN node n ON n.id = h.node_id
            LEFT JOIN relationship rel
              ON rel.child_node_id = h.node_id
             AND rel.relationship_type = 'VERIFIED_BY'
            LEFT JOIN causa linked_cause
              ON linked_cause.node_id = rel.parent_node_id
            WHERE h.id = %s
            LIMIT 1
            """,
            (hipotesis_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        output = dict(row)
        output["metadata"] = _normalize_metadata(output.get("metadata"))
        required_data, expected_evidence = ([], [])
        if output.get("node_id") is not None:
            required_data, expected_evidence = _hydrate_hypothesis_collections(cur, int(output["node_id"]))
        output["required_data"] = required_data
        output["expected_evidence"] = expected_evidence
        return output


def get_structural_edges() -> list[dict[str, Any]]:
    rows = relationship_repo.list_structural_edges()
    if not rows:
        return []
    node_ids = {int(row["parent_node_id"]) for row in rows} | {int(row["child_node_id"]) for row in rows}
    node_types: dict[int, str] = {}
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, node_type
            FROM node
            WHERE id = ANY(%s)
            """,
            (list(node_ids),),
        )
        for row in cur.fetchall():
            node_types[int(row["id"])] = row["node_type"]
    for row in rows:
        row["parent_node_type"] = node_types.get(int(row["parent_node_id"]))
        row["child_node_type"] = node_types.get(int(row["child_node_id"]))
    return rows


def get_structural_incoming_count(node_id: int) -> int:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) AS total
            FROM relationship
            WHERE child_node_id=%s
              AND relationship_type IN ('DEPENDS_ON', 'CAUSES')
            """,
            (node_id,),
        )
        return int(cur.fetchone()["total"])


def get_incoming_relationship_count(node_id: int) -> int:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) AS total
            FROM relationship
            WHERE child_node_id=%s
            """,
            (node_id,),
        )
        return int(cur.fetchone()["total"])


def get_structural_incoming_count_by_legacy(legacy_table: str, legacy_id: int) -> int:
    mapped = node_repo.get_by_legacy_ref(legacy_table, int(legacy_id))
    if not mapped:
        return 0
    return get_structural_incoming_count(int(mapped["id"]))


def get_outgoing_dependency_count(node_id: int) -> int:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) AS total
            FROM relationship
            WHERE parent_node_id=%s
              AND relationship_type IN ('DEPENDS_ON', 'CAUSES', 'VERIFIED_BY')
            """,
            (node_id,),
        )
        return int(cur.fetchone()["total"])


def get_analysis_reference_count(node_id: int) -> int:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) AS total
            FROM analisis_causas_detalle
            WHERE node_id=%s
            """,
            (node_id,),
        )
        return int(cur.fetchone()["total"])


def search_reusable_nodes(node_type: str, text: str | None = None, *, limit: int = 25) -> list[dict[str, Any]]:
    normalized_type = normalize_node_type(node_type)
    search_text = (text or "").strip()

    with db_cursor() as cur:
        base_query = """
            SELECT
                n.id,
                n.node_type,
                n.code,
                n.name,
                n.description,
                n.status,
                n.legacy_table,
                n.legacy_id,
                n.metadata,
                contract.id AS contract_id,
                contract.nombre AS contract_name,
                contract.metrica AS contract_metric,
                contract.objetivo AS contract_goal,
                process.id AS process_id,
                process.nombre AS process_name,
                owner_contract.id AS owner_contract_id,
                owner_contract.nombre AS owner_contract_name,
                owner_contract.metrica AS owner_contract_metric,
                owner_contract.objetivo AS owner_contract_goal,
                owner_process.id AS owner_process_id,
                owner_process.nombre AS owner_process_name,
                (
                    SELECT COUNT(*)
                    FROM relationship incoming
                    WHERE incoming.child_node_id = n.id
                      AND incoming.relationship_type IN ('DEPENDS_ON', 'CAUSES')
                ) AS incoming_relationships
            FROM node n
            LEFT JOIN contrato contract
              ON n.legacy_table = 'contrato'
             AND contract.id = n.legacy_id
            LEFT JOIN proceso process
              ON process.id = contract.proceso_id
            LEFT JOIN causa cause
              ON n.legacy_table = 'causa'
             AND cause.id = n.legacy_id
            LEFT JOIN contrato owner_contract
              ON owner_contract.id = COALESCE(cause.contrato_id, (
                    SELECT parent_node.legacy_id
                    FROM relationship rel
                    JOIN node parent_node ON parent_node.id = rel.parent_node_id
                    WHERE rel.child_node_id = n.id
                      AND parent_node.legacy_table = 'contrato'
                      AND rel.relationship_type IN ('DEPENDS_ON', 'CAUSES')
                    LIMIT 1
              ))
            LEFT JOIN proceso owner_process
              ON owner_process.id = owner_contract.proceso_id
        """
        if search_text:
            pattern = f"%{search_text}%"
            cur.execute(
                base_query
                + """
                WHERE n.node_type = %s
                  AND (
                        n.name ILIKE %s
                     OR n.code ILIKE %s
                     OR COALESCE(n.description, '') ILIKE %s
                     OR COALESCE(contract.nombre, '') ILIKE %s
                     OR COALESCE(contract.metrica, '') ILIKE %s
                     OR COALESCE(contract.objetivo, '') ILIKE %s
                     OR COALESCE(process.nombre, '') ILIKE %s
                     OR COALESCE(owner_contract.nombre, '') ILIKE %s
                     OR COALESCE(owner_contract.metrica, '') ILIKE %s
                     OR COALESCE(owner_contract.objetivo, '') ILIKE %s
                     OR COALESCE(owner_process.nombre, '') ILIKE %s
                     OR COALESCE(n.metadata::text, '') ILIKE %s
                  )
                ORDER BY LOWER(n.name), n.id
                LIMIT %s
                """,
                (
                    normalized_type,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    limit,
                ),
            )
        else:
            cur.execute(
                base_query
                + """
                WHERE n.node_type = %s
                ORDER BY LOWER(n.name), n.id
                LIMIT %s
                """,
                (normalized_type, limit),
            )
        rows = [dict(row) for row in cur.fetchall()]

    for row in rows:
        row["metadata"] = _normalize_metadata(row.get("metadata"))
    return rows
