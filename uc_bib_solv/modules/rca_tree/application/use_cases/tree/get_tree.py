from typing import Any

from ...dto import contract_id as normalize_contract_id, integer, normalize_tree_view
from ...ports.outbound import TreeQueryPort


class GetTree:
    """Build the requested causal-tree projection."""

    def __init__(self, queries: TreeQueryPort):
        self.queries = queries

    def execute(
        self,
        view: str = "arbol",
        selected_cause_id: int | str | None = None,
        zoom: float = 1.0,
        contract_id: int | str | None = None,
    ) -> dict[str, Any]:
        return self.queries.tree_payload(
            normalize_tree_view(view),
            integer(selected_cause_id),
            float(zoom),
            normalize_contract_id(contract_id),
        )
