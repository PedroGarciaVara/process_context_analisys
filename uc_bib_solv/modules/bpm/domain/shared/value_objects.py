"""Shared BPM identifiers and primitive validation objects."""

from __future__ import annotations

from dataclasses import dataclass
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


@dataclass(frozen=True)
class ProcessRef:
    process_id: str

    def __post_init__(self) -> None:
        object.__setattr__(self, "process_id", require_uuid(self.process_id, "process_id"))


@dataclass(frozen=True)
class OperationRef:
    node_id: str
    process_id: str

    def __post_init__(self) -> None:
        object.__setattr__(self, "node_id", require_uuid(self.node_id, "node_id"))
        object.__setattr__(self, "process_id", require_uuid(self.process_id, "process_id"))
