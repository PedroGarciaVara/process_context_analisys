"""Contract domain entity and BPM scope invariant."""

from __future__ import annotations

from dataclasses import dataclass

from ..exceptions import BpmDomainError
from ..value_objects import require_positive_int, require_text, require_uuid


@dataclass(frozen=True)
class Contract:
    contract_id: int | None
    name: str
    bpm_process_id: str | None = None
    bpm_node_id: str | None = None
    process_id: int | None = None
    metric: str | None = None
    objective: str | None = None

    def __post_init__(self) -> None:
        if self.contract_id is not None:
            object.__setattr__(self, "contract_id", require_positive_int(self.contract_id, "contract_id"))
        object.__setattr__(self, "name", require_text(self.name, "name"))
        has_process = bool(self.bpm_process_id)
        has_operation = bool(self.bpm_node_id)
        if has_process == has_operation:
            raise BpmDomainError("El contrato requiere un proceso BPM o una operación BPM", "invalid_bpm_scope")
        if has_process:
            object.__setattr__(self, "bpm_process_id", require_uuid(self.bpm_process_id, "bpm_process_id"))
        if has_operation:
            object.__setattr__(self, "bpm_node_id", require_uuid(self.bpm_node_id, "bpm_node_id"))
        if self.process_id is not None:
            object.__setattr__(self, "process_id", require_positive_int(self.process_id, "process_id"))
