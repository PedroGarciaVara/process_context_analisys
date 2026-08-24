"""Causal graph operations built on the canonical graph rules."""

from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from typing import Any

from ..exceptions import CycleDetectedError, NodeDeletionError
from .rules import would_create_cycle as graph_would_create_cycle


def would_create_cycle(edges: list[dict[str, Any]], parent_node_id: int, child_node_id: int) -> bool:
    return graph_would_create_cycle(edges, parent_node_id, child_node_id)


def ensure_acyclic(edges: list[dict[str, Any]], parent_node_id: int, child_node_id: int) -> None:
    if would_create_cycle(edges, parent_node_id, child_node_id):
        raise CycleDetectedError("La relación introduciría un ciclo en el DAG causal.")


def ensure_deletion_allowed(incoming: int, outgoing: int, analysis_references: int) -> None:
    if incoming > 1 or outgoing > 0 or analysis_references > 0:
        raise NodeDeletionError("El nodo tiene relaciones o trazabilidad y no puede eliminarse.")


def project_tree(root_ids: list[int], nodes: dict[int, dict[str, Any]], children: dict[int, list[int]]) -> dict[str, Any]:
    reused: set[int] = set()
    seen: set[int] = set()

    def visit(node_id: int, parent_id: int | None = None, path: tuple[int, ...] = ()) -> dict[str, Any] | None:
        if node_id in path or node_id in seen:
            reused.add(node_id)
            return None
        seen.add(node_id)
        result = deepcopy(nodes[node_id])
        result["parent_id"] = parent_id
        result["children"] = []
        for child_id in sorted(children.get(node_id, [])):
            child = visit(child_id, int(result.get("id", node_id)), (*path, node_id))
            if child is not None:
                result["children"].append(child)
        return result

    tree = [item for root in sorted(set(root_ids)) if (item := visit(root)) is not None]
    return {"tree": tree, "reused_node_ids": sorted(reused)}
