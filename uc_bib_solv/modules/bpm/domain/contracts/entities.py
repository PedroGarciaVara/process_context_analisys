"""Contract domain entity and BPM scope invariant."""

from __future__ import annotations

from dataclasses import dataclass

from ..shared.exceptions import BpmDomainError
from ..shared.value_objects import require_positive_int, require_text, require_uuid


@dataclass
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

    def rename(self, name: str) -> None:
        self.name = require_text(name, "name")

    def to_payload(self) -> dict:
        return {
            "name": self.name,
            "bpm_process_id": self.bpm_process_id,
            "bpm_node_id": self.bpm_node_id,
            "process_id": self.process_id,
            "metrica": self.metric,
            "objetivo": self.objective,
        }

    @classmethod
    def from_persistence(cls, data: dict) -> "Contract":
        return cls(
            contract_id=data.get("contract_id", data.get("id")),
            name=data.get("name", data.get("nombre", "")),
            bpm_process_id=data.get("bpm_process_id", data.get("bpmProcessId")),
            bpm_node_id=data.get("bpm_node_id", data.get("bpmNodeId")),
            process_id=data.get("process_id", data.get("processId", data.get("proceso_id"))),
            metric=data.get("metric", data.get("metrica")),
            objective=data.get("objective", data.get("objetivo")),
        )

    def apply_update(self, payload: dict) -> None:
        if "name" in payload or "nombre" in payload:
            self.rename(payload.get("name", payload.get("nombre")))
        if "metrica" in payload or "metric" in payload:
            self.metric = payload.get("metrica", payload.get("metric"))
        if "objetivo" in payload or "objective" in payload:
            self.objective = payload.get("objetivo", payload.get("objective"))
        if any(key in payload for key in ("bpm_process_id", "bpmProcessId", "bpm_node_id", "bpmNodeId")):
            self.change_scope(
                bpm_process_id=payload.get("bpm_process_id", payload.get("bpmProcessId")),
                bpm_node_id=payload.get("bpm_node_id", payload.get("bpmNodeId")),
            )

    def change_scope(self, *, bpm_process_id: str | None = None, bpm_node_id: str | None = None) -> None:
        has_process = bool(bpm_process_id)
        has_operation = bool(bpm_node_id)
        if has_process == has_operation:
            raise BpmDomainError("El contrato requiere un proceso BPM o una operación BPM", "invalid_bpm_scope")
        self.bpm_process_id = require_uuid(bpm_process_id, "bpm_process_id") if has_process else None
        self.bpm_node_id = require_uuid(bpm_node_id, "bpm_node_id") if has_operation else None
