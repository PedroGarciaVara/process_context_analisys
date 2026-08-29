"""Outbound ports for tree projections and reusable-node commands."""

from typing import Any, Protocol


class TreeQueryPort(Protocol):
    def tree_payload(
        self,
        view: str,
        selected_cause_id: int | None = None,
        zoom: float = 1.0,
        contract_id: int | None = None,
    ) -> dict[str, Any]: ...

    def search_reusable_nodes(
        self,
        node_type: str,
        text: str | None = None,
        contract_id: int | None = None,
        parent_id: int | None = None,
        limit: int = 25,
    ) -> list[dict[str, Any]]: ...

    def link_reusable_node(self, **kwargs: Any) -> dict[str, Any]: ...

    def create_contract_child(self, contract_id: int, name: str, **kwargs: Any) -> dict[str, Any]: ...


__all__ = ["TreeQueryPort"]
