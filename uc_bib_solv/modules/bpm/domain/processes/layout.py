"""Domain values and invariants for the BPM visual layout projection."""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from numbers import Real
from typing import Any, Iterable

from .exceptions import ProcessModelingError
from .value_objects import require_uuid


MIN_COORDINATE = -1_000_000.0
MAX_COORDINATE = 1_000_000.0


def _coordinate(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ProcessModelingError(f"{field} debe ser un número finito", "invalid_layout_coordinate")
    canonical = float(value)
    if not isfinite(canonical) or not MIN_COORDINATE <= canonical <= MAX_COORDINATE:
        raise ProcessModelingError(
            f"{field} debe estar entre {MIN_COORDINATE:g} y {MAX_COORDINATE:g}",
            "invalid_layout_coordinate",
        )
    return round(canonical, 3)


@dataclass(frozen=True)
class NodeLayoutPosition:
    """One manual position override for a canonical BPM node."""

    node_id: str
    x: float
    y: float

    def __post_init__(self):
        object.__setattr__(self, "node_id", require_uuid(self.node_id, "node_id"))
        object.__setattr__(self, "x", _coordinate(self.x, "x"))
        object.__setattr__(self, "y", _coordinate(self.y, "y"))

    @classmethod
    def from_payload(cls, value: Any) -> "NodeLayoutPosition":
        if not isinstance(value, dict):
            raise ProcessModelingError(
                "cada posición debe ser un objeto", "invalid_layout_payload"
            )
        return cls(node_id=value.get("node_id"), x=value.get("x"), y=value.get("y"))

    def as_dict(self) -> dict[str, str | float]:
        return {"node_id": self.node_id, "x": self.x, "y": self.y}


@dataclass(frozen=True)
class ProcessLayout:
    """Complete set of manual position overrides for one process."""

    process_id: str
    positions: tuple[NodeLayoutPosition, ...]

    def __post_init__(self):
        object.__setattr__(self, "process_id", require_uuid(self.process_id, "process_id"))
        node_ids = [position.node_id for position in self.positions]
        if len(node_ids) != len(set(node_ids)):
            raise ProcessModelingError(
                "un nodo no puede tener dos posiciones en el mismo layout",
                "duplicate_layout_node",
            )

    @classmethod
    def from_payload(cls, process_id: str, payload: Any) -> "ProcessLayout":
        if not isinstance(payload, dict) or not isinstance(payload.get("positions"), list):
            raise ProcessModelingError(
                "positions debe ser una lista", "invalid_layout_payload"
            )
        return cls(
            process_id=process_id,
            positions=tuple(NodeLayoutPosition.from_payload(item) for item in payload["positions"]),
        )

    def assert_nodes_belong_to(self, node_ids: Iterable[str]) -> None:
        allowed = {str(node_id) for node_id in node_ids}
        foreign = [position.node_id for position in self.positions if position.node_id not in allowed]
        if foreign:
            raise ProcessModelingError(
                "el layout contiene nodos que no pertenecen al proceso",
                "layout_node_process_mismatch",
            )

    def as_records(self) -> list[dict[str, str | float]]:
        return [position.as_dict() for position in self.positions]


__all__ = ["MAX_COORDINATE", "MIN_COORDINATE", "NodeLayoutPosition", "ProcessLayout"]
