from __future__ import annotations

from typing import Any

from .exceptions import BpmDomainError, OperationalModelError
from .value_objects import require_text


JSON_LIST_FIELDS = frozenset({"elements_zones_positions", "control_systems", "specific_parameters", "specific_operating_ranges", "specific_instructions"})
JSON_OBJECT_FIELDS = frozenset({"nominal_capacity"})
JSON_OBJECT_OR_LIST_FIELDS = frozenset({"common_limitations", "common_technical_characteristics", "specific_characteristics", "specific_limitations", "differences_from_machine_type"})


def validate_name(value: Any) -> str:
    return require_text(value, "name")


def validate_structured_field(value: Any, field: str, *, nullable: bool = True) -> Any:
    if value is None:
        if nullable:
            return None
        raise BpmDomainError(f"{field} es obligatorio.", "required_json", field)
    if field in JSON_LIST_FIELDS and not isinstance(value, list):
        raise BpmDomainError(f"{field} debe ser una lista.", "invalid_json_shape", field)
    if field in JSON_OBJECT_FIELDS and not isinstance(value, dict):
        raise BpmDomainError(f"{field} debe ser un objeto.", "invalid_json_shape", field)
    if field in JSON_OBJECT_OR_LIST_FIELDS and not isinstance(value, (dict, list)):
        raise BpmDomainError(f"{field} debe ser un objeto o una lista.", "invalid_json_shape", field)
    return value


def validate_machine_payload(payload: dict, *, partial: bool = False) -> dict:
    if not isinstance(payload, dict):
        raise BpmDomainError("machine debe ser un objeto", "invalid_payload")
    result = dict(payload)
    result.pop("operational_status", None)
    if not partial or "name" in payload or "nombre" in payload:
        result["name"] = validate_name(payload.get("name", payload.get("nombre")))
    if not partial or "machine_type_id" in payload:
        if payload.get("machine_type_id") is None and payload.get("machineTypeId") is None and not payload.get("machine_type"):
            raise BpmDomainError("machine_type_id es obligatorio", "machine_type_required")
        if payload.get("machine_type_id", payload.get("machineTypeId")) is not None:
            result["machine_type_id"] = int(payload.get("machine_type_id", payload.get("machineTypeId")))
    for field in JSON_LIST_FIELDS | JSON_OBJECT_FIELDS | JSON_OBJECT_OR_LIST_FIELDS:
        if field in payload:
            validate_structured_field(payload[field], field)
    return result


def validate_contract_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise BpmDomainError("contract debe ser un objeto", "invalid_payload")
    result = dict(payload)
    result["name"] = validate_name(payload.get("name"))
    process_id = payload.get("bpmProcessId", payload.get("bpm_process_id"))
    node_id = payload.get("bpmNodeId", payload.get("bpm_node_id"))
    if bool(process_id) == bool(node_id):
        raise BpmDomainError("Selecciona un proceso BPM o una operación BPM, pero no ambos.", "invalid_bpm_scope")
    if process_id:
        result["bpm_process_id"] = str(process_id)
        result.pop("bpm_node_id", None)
    else:
        result["bpm_node_id"] = str(node_id)
        result.pop("bpm_process_id", None)
    return result


def validate_process_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise BpmDomainError("process debe ser un objeto", "invalid_payload")
    result = dict(payload)
    for field in ("status", "status_proceso", "owner"):
        result.pop(field, None)
    result["name"] = validate_name(payload.get("name"))
    return result


def validate_configuration_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise OperationalModelError("configuration debe ser un objeto", "invalid_payload")
    result = dict(payload)
    for field in ("machine_id", "operation_id", "process_version_id", "process_id"):
        if payload.get(field) in (None, ""):
            raise OperationalModelError(f"{field} es obligatorio", "required_identity")
    return result
