"""Shared BPM identifiers and primitive validation objects."""

from __future__ import annotations

from uuid import UUID

from .exceptions import BpmDomainError


def require_uuid(value: str | UUID, field: str) -> str:
    try:
        return str(UUID(str(value)))
    except (AttributeError, TypeError, ValueError) as exc:
        raise BpmDomainError(f"{field} debe ser un UUID válido", "invalid_uuid", field) from exc


def require_text(value: str | None, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise BpmDomainError(f"{field} es obligatorio", "required_field", field)
    return value.strip()


def require_positive_int(value: int, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise BpmDomainError(f"{field} debe ser un entero positivo", "invalid_id", field)
    return value
