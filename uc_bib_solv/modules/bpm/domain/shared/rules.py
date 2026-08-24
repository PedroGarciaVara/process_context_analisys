"""Small pure validation rules shared by BPM aggregates."""

from __future__ import annotations

from typing import Any

from .exceptions import BpmDomainError
from .value_objects import require_text

JSON_LIST_FIELDS = frozenset({
    "elements_zones_positions",
    "control_systems",
    "specific_parameters",
    "specific_operating_ranges",
    "specific_instructions",
})
JSON_OBJECT_FIELDS = frozenset({"nominal_capacity"})
JSON_OBJECT_OR_LIST_FIELDS = frozenset({
    "common_limitations",
    "common_technical_characteristics",
    "specific_characteristics",
    "specific_limitations",
    "differences_from_machine_type",
})


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
