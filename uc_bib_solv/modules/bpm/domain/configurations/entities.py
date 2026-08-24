"""Machine-operation configuration entity."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..shared.value_objects import require_positive_int, require_uuid


@dataclass(frozen=True)
class MachineOperationConfiguration:
    machine_id: int
    operation_id: str
    process_version_id: str
    payload: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "machine_id", require_positive_int(self.machine_id, "machine_id"))
        object.__setattr__(self, "operation_id", require_uuid(self.operation_id, "operation_id"))
        object.__setattr__(self, "process_version_id", require_uuid(self.process_version_id, "process_version_id"))
        object.__setattr__(self, "payload", dict(self.payload or {}))
