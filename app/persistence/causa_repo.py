from __future__ import annotations

from app.domain.graph import (
    validate_delete_allowed,
    validate_no_cycle,
    validate_relationship_signature,
)
from app.persistence import graph_query_repo, graph_sync, node_repo, relationship_repo
from app.persistence.db import db_cursor


def _get_contract_node(contrato_id: int) -> dict:
    with db_cursor() as cur:
        cur.execute("SELECT id FROM contrato WHERE id=%s", (contrato_id,))
        contract = cur.fetchone()
    if not contract:
        raise ValueError("El contrato indicado no existe.")
    return node_repo.get_by_legacy_ref("contrato", int(contrato_id)) or graph_sync.sync_contract_graph(int(contrato_id))


def _get_cause_record(causa_id: int) -> dict:
    cause = get_by_id(int(causa_id))
    if not cause:
        raise ValueError("La causa indicada no existe.")
    return cause


def _get_cause_node(causa_id: int) -> dict:
    cause_node = node_repo.get_by_legacy_ref("causa", int(causa_id))
    if cause_node:
        return cause_node
    graph_sync.sync_causa_graph(int(causa_id))
    cause_node = node_repo.get_by_legacy_ref("causa", int(causa_id))
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
    return _get_contract_node(int(contrato_id)), "DEPENDS_ON"


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
        node = node_repo.create(
            "CAUSE",
            nombre.strip(),
            description=descripcion,
            metadata={
                "source": "app",
                "type": tipo,
                "category": categoria,
            },
        )
        cur.execute(
            """
            INSERT INTO causa(node_id, contrato_id, parent_id, nombre, descripcion, tipo, categoria)
            VALUES (%s, NULL, NULL, %s, %s, %s, %s)
            RETURNING id
            """,
            (int(node["id"]), nombre.strip(), descripcion, tipo, categoria),
        )
        causa_id = int(cur.fetchone()["id"])
        cur.execute(
            """
            UPDATE node
            SET legacy_table='causa', legacy_id=%s, updated_at=NOW()
            WHERE id=%s
            """,
            (causa_id, int(node["id"])),
        )
        relationship_repo.create(
            int(parent_node["id"]),
            int(node["id"]),
            relationship_type,
            metadata={"source": "app", "legacy_parent_id": parent_id, "contract_id": contrato_id},
            is_primary=True,
        )
    return get_by_id(causa_id) or {"id": causa_id, "node_id": node["id"], "nombre": nombre.strip()}


def get_by_contrato(contrato_id: int) -> list[dict]:
    graph_sync.sync_contract_graph(int(contrato_id))
    return graph_query_repo.get_projected_causes_for_contract(int(contrato_id))["rows"]


def get_by_id(causa_id: int) -> dict | None:
    graph_sync.sync_causa_graph(int(causa_id))
    return graph_query_repo.get_cause_record(int(causa_id))


def get_children(causa_id: int) -> list[dict]:
    cause = get_by_id(int(causa_id))
    if not cause:
        return []
    causes = get_by_contrato(int(cause["contrato_id"]))
    return [item for item in causes if item.get("parent_id") == int(causa_id)]


def get_ancestors(causa_id: int) -> list[int]:
    current = get_by_id(int(causa_id))
    if not current:
        return []
    contract_rows = get_by_contrato(int(current["contrato_id"]))
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
    node_repo.update(
        node_id,
        name=nombre.strip(),
        description=descripcion,
        metadata={
            **(cause.get("metadata") or {}),
            "type": tipo,
            "category": categoria,
        },
    )
    with db_cursor() as cur:
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
    return get_by_id(int(causa_id)) or cause


def delete(causa_id: int) -> bool:
    graph_sync.sync_causa_graph(int(causa_id))
    node = node_repo.get_by_legacy_ref("causa", int(causa_id))
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
