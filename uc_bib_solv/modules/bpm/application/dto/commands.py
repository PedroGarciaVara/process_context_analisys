"""Typed application commands for the BPM process-modeling boundary."""

from __future__ import annotations

from dataclasses import dataclass, fields
from typing import Any, ClassVar


class PayloadCommand:
    """DTO base that explicitly whitelists application input fields."""

    _excluded: ClassVar[frozenset[str]] = frozenset()

    @classmethod
    def from_payload(cls, payload: dict[str, Any], **defaults):
        names = {item.name for item in fields(cls)} - cls._excluded
        values = {key: value for key, value in payload.items() if key in names}
        values.update({key: value for key, value in defaults.items() if key in names and key not in values})
        return cls(**values)

    def to_dict(self) -> dict[str, Any]:
        return {item.name: getattr(self, item.name) for item in fields(self) if item.name not in self._excluded and getattr(self, item.name) is not None}


@dataclass
class ProcessCommand(PayloadCommand):
    process_code: str = ""
    name: str = ""
    description: str | None = None
    parent_process_id: str | None = None
    abstraction_level: int = 0
    status: str = "draft"


@dataclass
class NodeCommand(PayloadCommand):
    node_id: str | None = None
    node_code: str = ""
    node_type: str = "operation"
    name: str = ""
    description: str | None = None
    child_process_id: str | None = None
    output_role: str | None = None
    properties: dict[str, Any] | None = None


@dataclass
class TransitionCommand(PayloadCommand):
    transition_id: str | None = None
    source_node_id: str = ""
    target_node_id: str = ""
    transition_type: str = "sequence"
    label: str | None = None
    condition: str | None = None
    properties: dict[str, Any] | None = None


@dataclass
class ContractCommand(PayloadCommand):
    name: str = ""
    bpm_process_id: str | None = None
    bpm_node_id: str | None = None
    process_id: int | None = None
    metrica: str | None = None
    objetivo: str | None = None


@dataclass
class MachineCommand(PayloadCommand):
    name: str = ""
    machine_type_id: int | None = None
    contract_id: int | None = None
    specific_description: str | None = None


@dataclass
class ConfigurationCommand(PayloadCommand):
    machine_id: int = 0
    operation_id: str = ""
    process_id: str = ""
    contract_id: int | None = None
    validation_status: str = "draft"
    valid_from: Any = None
    valid_to: Any = None
    specific_description: str | None = None
    additional_inputs: list[Any] | None = None
    specific_controls: list[Any] | None = None
    available_measurements: list[Any] | None = None
    specific_safety_rules: list[Any] | None = None


@dataclass
class MachineAssociationCommand:
    machine_ids: list[int]

    @classmethod
    def from_payload(cls, payload: dict[str, Any]):
        raw = payload.get("machine_ids", payload.get("machineIds", [])) or []
        return cls(machine_ids=[int(value) for value in raw])


@dataclass
class OperationStagesCommand:
    etapas: Any = None
    process_id: str | None = None

    @classmethod
    def from_payload(cls, payload: dict[str, Any]):
        return cls(etapas=payload.get("etapas"), process_id=payload.get("process_id"))


__all__ = ["ConfigurationCommand", "ContractCommand", "MachineAssociationCommand", "MachineCommand", "NodeCommand", "OperationStagesCommand", "ProcessCommand", "TransitionCommand"]
