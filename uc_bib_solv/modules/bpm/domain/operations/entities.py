"""Canonical operation and stage domain entities."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..shared.exceptions import BpmDomainError
from ..shared.value_objects import OperationRef
from ..shared.value_objects import require_text, require_uuid


@dataclass(frozen=True)
class Operation:
    node_id: str
    process_id: str
    code: str
    name: str
    description: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "node_id", require_uuid(self.node_id, "node_id"))
        object.__setattr__(self, "process_id", require_uuid(self.process_id, "process_id"))
        object.__setattr__(self, "code", require_text(self.code, "code"))
        object.__setattr__(self, "name", require_text(self.name, "name"))
        object.__setattr__(self, "metadata", dict(self.metadata or {}))

    @property
    def reference(self) -> OperationRef:
        return OperationRef(self.node_id, self.process_id)


@dataclass(frozen=True)
class Stage:
    code: str
    name: str
    sequence: int
    description: str | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "code", require_text(self.code, "code"))
        object.__setattr__(self, "name", require_text(self.name, "name"))
        if isinstance(self.sequence, bool) or not isinstance(self.sequence, int) or self.sequence < 0:
            raise BpmDomainError("sequence debe ser un entero no negativo", "invalid_integer", "sequence")


__all__ = ["Operation", "Stage"]
