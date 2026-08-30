"""Canonical rules and projections for the RCA causal graph."""

from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from typing import Any

from ..exceptions import CycleDetectedError, InvalidRelationshipError, NodeDeletionError


NODE_TYPES = {"CONTRACT", "CAUSE", "HYPOTHESIS", "MACHINE", "PROCESS"}
RELATIONSHIP_TYPES = {"DEPENDS_ON", "CAUSES", "HAS_HYPOTHESIS", "BELONGS_TO"}
STRUCTURAL_RELATIONSHIP_TYPES = {"DEPENDS_ON", "CAUSES", "HAS_HYPOTHESIS"}

ALLOWED_RELATIONSHIPS = {
    ("CONTRACT", "DEPENDS_ON", "CONTRACT"),
    ("CONTRACT", "DEPENDS_ON", "CAUSE"),
    ("CAUSE", "CAUSES", "CAUSE"),
    ("CONTRACT", "CAUSES", "CAUSE"),
    ("CAUSE", "HAS_HYPOTHESIS", "HYPOTHESIS"),
    ("CAUSE", "DEPENDS_ON", "CONTRACT"),
    ("CONTRACT", "BELONGS_TO", "MACHINE"),
    ("CONTRACT", "BELONGS_TO", "PROCESS"),
    ("CAUSE", "BELONGS_TO", "MACHINE"),
    ("CAUSE", "BELONGS_TO", "PROCESS"),
}


def normalize_node_type(node_type: str | None) -> str:
    normalized = (node_type or "").strip().upper()
    if normalized not in NODE_TYPES:
        raise InvalidRelationshipError(f"Tipo de nodo inválido: {node_type!r}")
    return normalized


def normalize_relationship_type(relationship_type: str | None) -> str:
    normalized = (relationship_type or "").strip().upper()
    if normalized not in RELATIONSHIP_TYPES:
        raise InvalidRelationshipError(f"Tipo de relación inválido: {relationship_type!r}")
    return normalized


def validate_relationship_signature(
    parent_node_type: str | None,
    child_node_type: str | None,
    relationship_type: str | None,
) -> tuple[str, str, str]:
    parent = normalize_node_type(parent_node_type)
    child = normalize_node_type(child_node_type)
    relation = normalize_relationship_type(relationship_type)
    if (parent, relation, child) not in ALLOWED_RELATIONSHIPS:
        raise InvalidRelationshipError(
            "Combinación de relación no permitida: "
            f"{parent} -[{relation}]-> {child}"
        )
    return parent, child, relation


def would_create_cycle(
    edges: list[dict[str, Any]],
    parent_node_id: int | None,
    child_node_id: int | None,
    relationship_type: str | None = None,
) -> bool:
    if parent_node_id is None or child_node_id is None:
        return False
    if int(parent_node_id) == int(child_node_id):
        return True

    relation = normalize_relationship_type(relationship_type) if relationship_type else None
    adjacency: dict[int, set[int]] = defaultdict(set)
    for edge in edges:
        edge_relation = edge.get("relationship_type")
        if relation and edge_relation and normalize_relationship_type(edge_relation) not in STRUCTURAL_RELATIONSHIP_TYPES:
            continue
        if not relation and edge_relation and normalize_relationship_type(edge_relation) not in STRUCTURAL_RELATIONSHIP_TYPES:
            continue
        adjacency[int(edge["parent_node_id"])].add(int(edge["child_node_id"]))

    stack = [int(child_node_id)]
    visited: set[int] = set()
    target = int(parent_node_id)

    while stack:
        current = stack.pop()
        if current == target:
            return True
        if current in visited:
            continue
        visited.add(current)
        stack.extend(sorted(adjacency.get(current, set()), reverse=True))
    return False


def validate_no_cycle(
    edges: list[dict[str, Any]],
    parent_node_id: int | None,
    child_node_id: int | None,
    relationship_type: str | None = None,
) -> None:
    if would_create_cycle(edges, parent_node_id, child_node_id, relationship_type=relationship_type):
        raise CycleDetectedError("La relación introduciría un ciclo en el DAG causal.")


def validate_delete_allowed(
    *,
    incoming_relationships: int,
    outgoing_relationships: int,
    analysis_references: int,
) -> None:
    if incoming_relationships > 1:
        raise NodeDeletionError("El nodo está reutilizado por múltiples padres y no puede eliminarse.")
    if outgoing_relationships > 0:
        raise NodeDeletionError("El nodo tiene descendencia o hipótesis vinculadas y no puede eliminarse.")
    if analysis_references > 0:
        raise NodeDeletionError("El nodo tiene trazabilidad de análisis asociada y no puede eliminarse.")


def project_graph_as_tree(
    root_ids: list[int],
    nodes_by_id: dict[int, dict[str, Any]],
    child_ids_by_parent: dict[int, list[int]],
) -> dict[str, Any]:
    visited_paths: set[tuple[int, ...]] = set()
    seen_node_ids: set[int] = set()
    reused_node_ids: set[int] = set()

    def sort_key(node_id: int) -> tuple[Any, ...]:
        node = nodes_by_id[node_id]
        return (
            str(node.get("name") or "").lower(),
            str(node.get("code") or "").lower(),
            int(node_id),
        )

    def visit(
        node_id: int,
        *,
        parent_business_id: int | None = None,
        path: tuple[int, ...] = (),
    ) -> dict[str, Any] | None:
        if node_id in path:
            reused_node_ids.add(node_id)
            return None

        next_path = (*path, node_id)
        if next_path in visited_paths:
            reused_node_ids.add(node_id)
            return None
        if node_id in seen_node_ids:
            reused_node_ids.add(node_id)
            return None
        visited_paths.add(next_path)
        seen_node_ids.add(node_id)
        source = nodes_by_id[node_id]
        projected = deepcopy(source)
        projected["parent_id"] = parent_business_id
        projected["parent_node_id"] = path[-1] if path else None
        projected["children"] = []

        for child_id in sorted(child_ids_by_parent.get(node_id, []), key=sort_key):
            child_projected = visit(
                child_id,
                parent_business_id=int(projected["id"]),
                path=next_path,
            )
            if child_projected is not None:
                projected["children"].append(child_projected)
        return projected

    roots: list[dict[str, Any]] = []
    for root_id in sorted(dict.fromkeys(root_ids), key=sort_key):
        root = visit(root_id, parent_business_id=None, path=())
        if root is not None:
            roots.append(root)

    return {
        "tree": roots,
        "reused_node_ids": sorted(reused_node_ids),
    }
