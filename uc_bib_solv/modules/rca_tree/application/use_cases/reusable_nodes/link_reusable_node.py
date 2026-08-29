from typing import Any

from ...ports.outbound import TreeQueryPort


class LinkReusableNode:
    """Link an existing causal node into the current contract tree."""

    def __init__(self, queries: TreeQueryPort):
        self.queries = queries

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        child_node_id = payload.get("child_node_id")
        if not child_node_id:
            raise ValueError("Selecciona un nodo reutilizable antes de vincular.")
        result = self.queries.link_reusable_node(
            child_node_id=int(child_node_id),
            contract_id=payload.get("contract_id"),
            parent_id=payload.get("parent_id"),
        )
        result["message"] = {
            "CONTRACT": "Contrato existente vinculado.",
            "CAUSE": "Causa existente vinculada.",
        }.get(result["child"]["node_type"], "Nodo existente vinculado.")
        return result
