from __future__ import annotations

import psycopg2.extras
import uuid

from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import (
    validate_delete_allowed,
    validate_no_cycle,
    validate_relationship_signature,
)
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import graph_query_repo, graph_sync, node_repo
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


def _get_contract_node(contrato_id: int) -> dict:
    with db_cursor() as cur:
        cur.execute("SELECT id FROM contrato WHERE id=%s", (contrato_id,))
        contract = cur.fetchone()
    if not contract:
        raise ValueError("El contrato indicado no existe.")
    return node_repo.get_for_contract(int(contrato_id)) or graph_sync.sync_contract_graph(int(contrato_id))


def _get_cause_record(causa_id: int) -> dict:
    cause = get_by_id(int(causa_id))
    if not cause:
        raise ValueError("La causa indicada no existe.")
    return cause


def _get_cause_node(causa_id: int) -> dict:
    cause_node = node_repo.get_for_cause(int(causa_id))
    if cause_node:
        return cause_node
    graph_sync.sync_causa_graph(int(causa_id))
    cause_node = node_repo.get_for_cause(int(causa_id))
    if not cause_node:
        raise ValueError("No se pudo resolver el nodo canónico de la causa.")
    return cause_node


def _resolve_parent_context(
    contrato_id: int,
    parent_id: int | None,
) -> tuple[dict, str]:
    if parent_id is not None:
        parent_record = _get_cause_record(int(parent_id))
        parent_node = _get_cause_node(int(parent_id))
        if parent_record.get("contrato_id") and int(parent_record["contrato_id"]) != int(contrato_id):
            raise ValueError("La causa padre pertenece a otro contrato.")
        return parent_node, "CAUSES"
    return _get_contract_node(int(contrato_id)), "CAUSES"


def create(
    contrato_id: int,
    nombre: str,
    descripcion: str | None = None,
    tipo: str = "causa",
    categoria: str | None = None,
    parent_id: int | None = None,
) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre de la causa es obligatorio.")

    parent_node, relationship_type = _resolve_parent_context(int(contrato_id), parent_id)
    validate_relationship_signature(parent_node["node_type"], "CAUSE", relationship_type)
    validate_no_cycle(
        graph_query_repo.get_structural_edges(),
        int(parent_node["id"]),
        -1,
        relationship_type=relationship_type,
    )

    with db_cursor() as cur:
        cur.execute("""INSERT INTO node(node_type, code, name, description, metadata)
                       VALUES ('CAUSE', %s, %s, %s, %s)
                       RETURNING id, node_type, code, name, description, status, metadata""",
                    (f"CAUSE:{uuid.uuid4().hex}", nombre.strip(), descripcion,
                     psycopg2.extras.Json({"source": "app", "type": tipo, "category": categoria})))
        node = dict(cur.fetchone())
        cur.execute(
            """
            INSERT INTO causa(node_id, contrato_id, parent_id, nombre, descripcion, tipo, categoria)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (int(node["id"]), int(contrato_id), parent_id, nombre.strip(), descripcion, tipo, categoria),
        )
        causa_id = int(cur.fetchone()["id"])
        cur.execute(
            """
            INSERT INTO relationship(
                parent_node_id, child_node_id, relationship_type, metadata, is_primary
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (parent_node_id, child_node_id, relationship_type)
            DO UPDATE SET
                metadata = EXCLUDED.metadata,
                is_primary = relationship.is_primary OR EXCLUDED.is_primary,
                updated_at = NOW()
            """,
            (
                int(parent_node["id"]),
                int(node["id"]),
                relationship_type,
                psycopg2.extras.Json({"source": "app", "contract_id": contrato_id}),
                True,
            ),
        )
    return get_by_id(causa_id) or {"id": causa_id, "node_id": node["id"], "nombre": nombre.strip()}


def list_by_contract(contract_id: int) -> list[dict]:
    graph_sync.sync_contract_graph(int(contract_id))
    return graph_query_repo.get_projected_causes_for_contract(int(contract_id))["rows"]


def get_by_id(causa_id: int) -> dict | None:
    graph_sync.sync_causa_graph(int(causa_id))
    return graph_query_repo.get_cause_record(int(causa_id))


def get_children(causa_id: int) -> list[dict]:
    cause = get_by_id(int(causa_id))
    if not cause:
        return []
    causes = list_by_contract(int(cause["contrato_id"]))
    return [item for item in causes if item.get("parent_id") == int(causa_id)]


def get_ancestors(causa_id: int) -> list[int]:
    current = get_by_id(int(causa_id))
    if not current:
        return []
    contract_rows = list_by_contract(int(current["contrato_id"]))
    by_id = {int(row["id"]): row for row in contract_rows}
    ancestors: list[int] = []
    walker = current
    visited: set[int] = set()
    while walker and walker.get("parent_id") is not None and int(walker["parent_id"]) not in visited:
        parent_id = int(walker["parent_id"])
        ancestors.append(parent_id)
        visited.add(parent_id)
        walker = by_id.get(parent_id)
    return ancestors


def update(
    causa_id: int,
    nombre: str,
    descripcion: str | None = None,
    tipo: str = "causa",
    categoria: str | None = None,
) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre de la causa es obligatorio.")

    cause = _get_cause_record(int(causa_id))
    node_id = int(cause["node_id"]) if cause.get("node_id") else int(_get_cause_node(int(causa_id))["id"])
    with db_cursor() as cur:
        cur.execute("""UPDATE node SET name=%s, description=%s, metadata=%s, updated_at=NOW()
                       WHERE id=%s""", (nombre.strip(), descripcion,
                       psycopg2.extras.Json({**(cause.get("metadata") or {}), "type": tipo, "category": categoria}), node_id))
        cur.execute(
            """
            UPDATE causa
            SET nombre=%s, descripcion=%s, tipo=%s, categoria=%s, updated_at=NOW()
            WHERE id=%s
            RETURNING id
            """,
            (nombre.strip(), descripcion, tipo, categoria, causa_id),
        )
        if not cur.fetchone():
            raise ValueError("Causa no encontrada.")
        if cause.get("is_initial_template"):
            cur.execute(
                "UPDATE contrato SET nombre=%s, objetivo=%s WHERE id=%s",
                (nombre.strip(), descripcion, cause["contrato_id"]),
            )
    return get_by_id(int(causa_id)) or cause


def delete(causa_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute("SELECT is_initial_template FROM causa WHERE id=%s", (causa_id,))
        row = cur.fetchone()
    if row and row.get("is_initial_template"):
        raise ValueError("La causa raíz inicial del contrato está protegida contra borrado.")
    graph_sync.sync_causa_graph(int(causa_id))
    node = node_repo.get_for_cause(int(causa_id))
    if not node:
        with db_cursor() as cur:
            cur.execute("DELETE FROM causa WHERE id=%s", (causa_id,))
            return cur.rowcount > 0

    incoming = graph_query_repo.get_structural_incoming_count(int(node["id"]))
    outgoing = graph_query_repo.get_outgoing_dependency_count(int(node["id"]))
    references = graph_query_repo.get_analysis_reference_count(int(node["id"]))
    validate_delete_allowed(
        incoming_relationships=incoming,
        outgoing_relationships=outgoing,
        analysis_references=references,
    )

    with db_cursor() as cur:
        cur.execute("DELETE FROM causa WHERE id=%s", (causa_id,))
    node_repo.delete(int(node["id"]))
    return True


def build_tree(causas_list: list[dict]) -> list[dict]:
    by_id: dict[int, dict] = {}
    roots: list[dict] = []
    for causa in causas_list:
        if causa.get("node_type") != "CAUSE":
            continue
        node = dict(causa)
        node["children"] = []
        by_id[int(node["id"])] = node

    for node in by_id.values():
        parent_id = node.get("parent_id")
        if parent_id is None or int(parent_id) not in by_id:
            roots.append(node)
            continue
        parent = by_id[int(parent_id)]
        parent["children"].append(node)
    return roots
