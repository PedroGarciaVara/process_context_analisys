"""Payload rules for the operational machine aggregate."""

from __future__ import annotations

from ..shared.exceptions import BpmDomainError
from ..shared.rules import (
    JSON_LIST_FIELDS,
    JSON_OBJECT_FIELDS,
    JSON_OBJECT_OR_LIST_FIELDS,
    validate_name,
    validate_structured_field,
)


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
