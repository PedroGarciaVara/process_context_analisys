"""Outbound ports for causal graph persistence."""

from typing import Any, Protocol


class CauseRepositoryPort(Protocol):
    def get(self, cause_id: int) -> dict[str, Any] | None: ...

    def create(
        self,
        contract_id: int,
        name: str,
        description: str | None = None,
        kind: str = "causa",
        category: str | None = None,
        parent_id: int | None = None,
    ) -> dict[str, Any]: ...

    def update(
        self,
        cause_id: int,
        name: str,
        description: str | None = None,
        kind: str = "causa",
        category: str | None = None,
    ) -> dict[str, Any]: ...

    def delete(self, cause_id: int) -> bool: ...


class CausalReparentingPort(Protocol):
    """Atomic persistence boundary for a cause move.

    Implementations must validate again under their transaction/lock and must
    update parent_id, primary CAUSES link and audit row in one commit.
    """

    def get_move_context(self, cause_id: int, parent_id: int | None = None) -> dict[str, Any]: ...

    def move_cause(self, command: Any) -> dict[str, Any]: ...

    def reparent(self, command: Any) -> dict[str, Any]: ...


class HypothesisRepositoryPort(Protocol):
    def get(self, hypothesis_id: int) -> dict[str, Any] | None: ...

    def list_for_cause(self, cause_id: int) -> list[dict[str, Any]]: ...

    def create(
        self,
        cause_id: int,
        description: str,
        kind: str = "aceptacion",
        validation_criterion: str | None = None,
        status: str = "pendiente",
        **extra: Any,
    ) -> dict[str, Any]: ...

    def update(
        self,
        hypothesis_id: int,
        description: str,
        kind: str | None = None,
        validation_criterion: str | None = None,
        status: str | None = None,
        **extra: Any,
    ) -> dict[str, Any]: ...

    def delete(self, hypothesis_id: int) -> bool: ...


class NodeRepositoryPort(Protocol):
    def get(self, node_id: int) -> dict[str, Any] | None: ...



class RelationshipRepositoryPort(Protocol):
    def create(self, parent_node_id: int, child_node_id: int, relationship_type: str, **kwargs: Any) -> dict[str, Any]: ...

    def list_structural_edges(self) -> list[dict[str, Any]]: ...


__all__ = [
    "CauseRepositoryPort",
    "HypothesisRepositoryPort",
    "NodeRepositoryPort",
    "RelationshipRepositoryPort",
    "CausalReparentingPort",
]
