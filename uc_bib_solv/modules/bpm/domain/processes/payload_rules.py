"""Payload rules for the canonical process aggregate."""

from __future__ import annotations

from ..shared.exceptions import BpmDomainError
from ..shared.rules import validate_name


def validate_process_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise BpmDomainError("process debe ser un objeto", "invalid_payload")
    result = dict(payload)
    for field in ("status", "status_proceso", "owner"):
        result.pop(field, None)
    result["name"] = validate_name(payload.get("name"))
    return result
