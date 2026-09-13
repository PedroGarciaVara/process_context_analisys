"""Typed application commands for the BPM process-modeling boundary."""

from __future__ import annotations

from dataclasses import dataclass, fields
from typing import Any, ClassVar
from uuid import UUID


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
    kpi_description: str = ""
    kpi_args: str = ""
    kpi_function: str = ""
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
class OperationMachineAssociationCommand:
    """Canonical machine ids for one BPM operation.

    Membership identifiers are deliberately strict: JSON booleans, strings,
    duplicate values and implicit coercions are not accepted at the boundary.
    """
    machine_ids: list[int]
    process_id: str
    contract_id: int | None = None

    @classmethod
    def from_payload(cls, payload: dict[str, Any]):
        if not isinstance(payload, dict):
            raise ValueError("El payload debe ser un objeto JSON.")
        def reject_legacy(container):
            if not isinstance(container, dict):
                return False
            if any(key in container for key in ("equipment", "operation_machine_assignments")):
                return True
            canonical = container.get("canonical_ids")
            return isinstance(canonical, dict) and "maquina_ids" in canonical
        if reject_legacy(payload) or reject_legacy(payload.get("data")):
            raise ValueError("La pertenencia máquina-operación debe enviarse como machine_ids canónicos.")
        raw = payload.get("machine_ids", payload.get("machineIds", []))
        if raw is None:
            raw = []
        if not isinstance(raw, list):
            raise ValueError("machine_ids debe ser una lista de identificadores canónicos.")
        if any(isinstance(value, bool) or not isinstance(value, int) for value in raw):
            raise ValueError("machine_ids solo admite identificadores enteros canónicos.")
        if len(raw) != len(set(raw)):
            raise ValueError("machine_ids no puede contener duplicados.")
        process_id = payload.get("process_id", payload.get("processId"))
        if not isinstance(process_id, str) or not process_id.strip():
            raise ValueError("process_id es obligatorio.")
        try:
            UUID(process_id.strip())
        except ValueError as exc:
            raise ValueError("process_id debe ser un UUID válido.") from exc
        contract_id = payload.get("contract_id", payload.get("contractId"))
        if contract_id is not None and (isinstance(contract_id, bool) or not isinstance(contract_id, int)):
            raise ValueError("contract_id debe ser un identificador entero.")
        return cls(machine_ids=list(raw), process_id=process_id.strip(), contract_id=contract_id)


@dataclass
class OperationStagesCommand:
    etapas: Any = None
    process_id: str | None = None

    @classmethod
    def from_payload(cls, payload: dict[str, Any]):
        return cls(etapas=payload.get("etapas"), process_id=payload.get("process_id"))


__all__ = ["ConfigurationCommand", "ContractCommand", "MachineAssociationCommand", "OperationMachineAssociationCommand", "MachineCommand", "NodeCommand", "OperationStagesCommand", "ProcessCommand", "TransitionCommand"]
