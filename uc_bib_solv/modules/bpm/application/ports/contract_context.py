"""Narrow BPM contract context port for cross-context reference queries."""

from typing import Any, Protocol


class ContractContextPort(Protocol):
    """Minimal contract capability exposed outside BPM."""

    def get_by_id(self, contract_id: int) -> dict[str, Any] | None: ...
    def get_all(self) -> list[dict[str, Any]]: ...
    def create(
        self,
        process_id: int,
        name: str,
        metric: str | None = None,
        objective: str | None = None,
        bpm_process_id: str | None = None,
        bpm_node_id: str | None = None,
    ) -> dict[str, Any]: ...


__all__ = ["ContractContextPort"]
