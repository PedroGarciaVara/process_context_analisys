"""Pure invariants for machines and machine-operation configuration."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from .exceptions import MachineModelError

OPERATION_STATUSES = frozenset({"draft", "validated", "rejected"})
JSON_LIST_FIELDS = frozenset({"elements_zones_positions", "control_systems", "common_technical_characteristics", "common_limitations", "specific_characteristics", "specific_parameters", "specific_operating_ranges", "specific_limitations", "specific_instructions", "additional_inputs", "specific_controls", "available_measurements", "specific_safety_rules"})
JSON_OBJECT_OR_LIST_FIELDS = frozenset({"specific_characteristics", "specific_limitations", "differences_from_machine_type"})
JSON_OBJECT_FIELDS = frozenset({"nominal_capacity"})
STAGES_SCHEMA_VERSION = 1


def validate_stage_tree(value: Any) -> list[dict]:
    """Return the canonical, deterministic two-level stage tree.

    The persisted envelope is handled separately; this function deliberately
    accepts the API-facing array so domain callers cannot accidentally couple
    themselves to JSONB storage details.
    """
    if value is None:
        return []
    if not isinstance(value, list):
        raise MachineModelError("etapas debe ser una lista", "invalid_stages_shape")

    result = []
    all_ids = set()
    for index, stage in enumerate(value, 1):
        if not isinstance(stage, dict):
            raise MachineModelError("cada etapa debe ser un objeto", "invalid_stage")
        identifier = str(stage.get("id") or "").strip() or f"stage-{index}"
        if identifier in all_ids:
            raise MachineModelError("id de etapa duplicado", "duplicate_stage_id")
        name = stage.get("nombre")
        if not isinstance(name, str) or not name.strip():
            raise MachineModelError("el nombre de la etapa es obligatorio", "invalid_stage_name")
        order = stage.get("orden", index)
        if isinstance(order, bool) or not isinstance(order, int) or order < 1:
            raise MachineModelError("orden de etapa inválido o duplicado", "invalid_stage_order")
        children = stage.get("subetapas", [])
        if not isinstance(children, list):
            raise MachineModelError("subetapas debe ser una lista", "invalid_substages_shape")

        canonical_children = []
        child_ids = set()
        child_orders = set()
        for child_index, child in enumerate(children, 1):
            if not isinstance(child, dict):
                raise MachineModelError("cada subetapa debe ser un objeto", "invalid_substage")
            if child.get("subetapas") not in (None, []):
                raise MachineModelError("solo se permiten dos niveles de etapas", "invalid_stage_depth")
            child_id = str(child.get("id") or "").strip() or f"{identifier}-substage-{child_index}"
            child_name = child.get("nombre")
            child_order = child.get("orden", child_index)
            if child_id in all_ids or child_id in child_ids:
                raise MachineModelError("id de etapa duplicado", "duplicate_stage_id")
            if not isinstance(child_name, str) or not child_name.strip():
                raise MachineModelError("el nombre de la subetapa es obligatorio", "invalid_stage_name")
            if isinstance(child_order, bool) or not isinstance(child_order, int) or child_order < 1 or child_order in child_orders:
                raise MachineModelError("orden de subetapa inválido o duplicado", "invalid_stage_order")
            child_ids.add(child_id)
            all_ids.add(child_id)
            child_orders.add(child_order)
            canonical_children.append({"id": child_id, "nombre": child_name.strip(), "orden": child_order, "subetapas": []})

        if order in {item["orden"] for item in result}:
            raise MachineModelError("orden de etapa inválido o duplicado", "invalid_stage_order")
        all_ids.add(identifier)
        result.append({"id": identifier, "nombre": name.strip(), "orden": order, "subetapas": sorted(canonical_children, key=lambda item: item["orden"])})

    return sorted(result, key=lambda item: item["orden"])


def validate_stages_envelope(value: Any) -> dict:
    """Validate the versioned JSONB value stored at properties.etapas."""
    if value is None:
        return {"schema_version": STAGES_SCHEMA_VERSION, "etapas": []}
    if not isinstance(value, dict):
        raise MachineModelError("etapas debe usar una envolvente versionada", "invalid_stages_envelope")
    version = value.get("schema_version")
    if version != STAGES_SCHEMA_VERSION:
        raise MachineModelError("versión de etapas no soportada", "unsupported_stages_version")
    if set(value) - {"schema_version", "etapas"}:
        raise MachineModelError("la envolvente de etapas contiene claves no permitidas", "invalid_stages_envelope")
    return {"schema_version": STAGES_SCHEMA_VERSION, "etapas": validate_stage_tree(value.get("etapas", []))}


def canonical_stages(value: Any, *, envelope: bool = False) -> dict | list[dict]:
    """Normalize API arrays and persisted envelopes through one domain gate."""
    if isinstance(value, dict):
        result = validate_stages_envelope(value)
    else:
        result = {"schema_version": STAGES_SCHEMA_VERSION, "etapas": validate_stage_tree(value)}
    return result if envelope else result["etapas"]


def validate_stages(value: Any) -> list[dict]:
    return canonical_stages(value)


def _text(value: Any, field: str, required: bool = False) -> str | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or not value.strip():
        raise MachineModelError(f"{field} es obligatorio", "required_field")
    return value.strip()


def _uuid(value: Any, field: str) -> str:
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError) as exc:
        raise MachineModelError(f"{field} debe ser un UUID válido", "invalid_uuid") from exc


def _structured(value: Any, field: str, required_list: bool = False) -> Any:
    if value is None:
        return None
    if required_list and not isinstance(value, list):
        raise MachineModelError(f"{field} debe ser una lista estructurada", "invalid_json_shape")
    if not isinstance(value, (dict, list)):
        raise MachineModelError(f"{field} debe ser un objeto o lista estructurada", "invalid_json_shape")
    return value


def _valid_json_contract(payload: dict, fields: frozenset[str]) -> None:
    for field in fields:
        if field in payload:
            if field in JSON_OBJECT_FIELDS:
                if payload[field] is not None and not isinstance(payload[field], dict):
                    raise MachineModelError(f"{field} debe ser un objeto", "invalid_json_shape")
            else:
                _structured(payload[field], field, field in JSON_LIST_FIELDS and field not in {"specific_characteristics", "specific_limitations"})


def validate_machine_type_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise MachineModelError("machine_type debe ser un objeto", "invalid_payload")
    result = dict(payload)
    result["name"] = _text(payload.get("name", payload.get("nombre")), "name", True)
    result["operating_principle"] = _text(payload.get("operating_principle"), "operating_principle", True)
    result["general_technical_description"] = _text(payload.get("general_technical_description"), "general_technical_description", True)
    _valid_json_contract(result, frozenset({"nominal_capacity", "elements_zones_positions", "control_systems", "common_technical_characteristics", "common_limitations"}))
    return result


def validate_machine_payload(payload: dict, *, partial: bool = False) -> dict:
    if not isinstance(payload, dict):
        raise MachineModelError("machine debe ser un objeto", "invalid_payload")
    result = dict(payload)
    result.pop("operational_status", None)
    if not partial or "name" in payload or "nombre" in payload:
        result["name"] = _text(payload.get("name", payload.get("nombre")), "name", True)
    if not partial or "machine_type_id" in payload:
        if payload.get("machine_type_id") is None:
            raise MachineModelError("machine_type_id es obligatorio", "machine_type_required")
        result["machine_type_id"] = int(payload["machine_type_id"])
    _valid_json_contract(result, JSON_LIST_FIELDS | {"differences_from_machine_type"})
    return result


def validate_configuration_payload(payload: dict, *, partial: bool = False) -> dict:
    if not isinstance(payload, dict):
        raise MachineModelError("configuration debe ser un objeto", "invalid_payload")
    result = dict(payload)
    for field in ("machine_id", "operation_id", "process_version_id", "process_id"):
        if not partial or field in payload:
            if payload.get(field) is None:
                raise MachineModelError(f"{field} es obligatorio", "required_identity")
            result[field] = _uuid(payload[field], field) if field != "machine_id" else int(payload[field])
    status = payload.get("validation_status", "draft")
    if status not in OPERATION_STATUSES:
        raise MachineModelError("validation_status no permitido", "invalid_validation_status")
    result["validation_status"] = status
    _valid_json_contract(result, frozenset({"additional_inputs", "specific_controls", "available_measurements", "specific_safety_rules"}))
    valid_from = payload.get("valid_from")
    valid_to = payload.get("valid_to")
    if valid_from and valid_to:
        try:
            start = valid_from if isinstance(valid_from, datetime) else datetime.fromisoformat(str(valid_from).replace("Z", "+00:00"))
            end = valid_to if isinstance(valid_to, datetime) else datetime.fromisoformat(str(valid_to).replace("Z", "+00:00"))
        except ValueError as exc:
            raise MachineModelError("valid_from y valid_to deben ser fechas ISO válidas", "invalid_validity") from exc
        if end < start:
            raise MachineModelError("valid_to no puede preceder a valid_from", "invalid_validity")
    return result


def classify_field(*, common: bool = False, permanent: bool = False, contextual: bool = False) -> str:
    flags = sum(bool(item) for item in (common, permanent, contextual))
    if flags != 1:
        raise MachineModelError("un campo debe tener exactamente una clasificación", "ambiguous_field_classification")
    return "machine_type" if common else "machine" if permanent else "machine_operation_configuration"


def validate_operation_identity(*, node_id: Any, node_type: str, node_version_id: Any, process_version_id: Any) -> str:
    """Validate the canonical BPM identity before persistence.

    The database trigger repeats this check; keeping the pure validation here
    prevents a UI/API adapter from treating a label or contract ID as an
    operation identity.
    """
    operation_id = _uuid(node_id, "operation_id")
    version_id = _uuid(process_version_id, "process_version_id")
    if node_type != "operation":
        raise MachineModelError("operation_id debe referenciar un nodo BPM operation", "invalid_operation_type")
    if str(node_version_id) != version_id:
        raise MachineModelError("operation_id no pertenece a process_version_id", "operation_version_mismatch")
    return operation_id
