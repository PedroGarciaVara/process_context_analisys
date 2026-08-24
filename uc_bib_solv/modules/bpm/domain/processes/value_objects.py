"""Process and BPM graph value objects."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from .exceptions import ProcessModelingError

NODE_TYPES = frozenset({"input", "output", "operation", "subprocess", "decision", "stock"})
TRANSITION_TYPES = frozenset({"sequence", "branch"})
PROCESS_STATUSES = frozenset({"draft", "active"})
VERSION_STATUSES = frozenset({"draft", "review", "approved", "published", "obsolete"})


def require_uuid(value: str | UUID, field: str) -> str:
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ProcessModelingError(f"{field} debe ser un UUID válido", "invalid_uuid") from exc


def require_text(value: str | None, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ProcessModelingError(f"{field} es obligatorio", "required_field")
    return value.strip()


@dataclass(frozen=True)
class ProcessCode:
    value: str

    def __post_init__(self):
        object.__setattr__(self, "value", require_text(self.value, "process_code"))


@dataclass(frozen=True)
class NodeCode:
    value: str

    def __post_init__(self):
        object.__setattr__(self, "value", require_text(self.value, "node_code"))


def require_non_negative_int(value: int, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ProcessModelingError(f"{field} debe ser un entero no negativo", "invalid_integer")
    return value


def validate_stock_properties(properties: dict) -> dict:
    stock = properties.get("stock") if isinstance(properties, dict) else None
    if not isinstance(stock, dict):
        raise ProcessModelingError("un stock requiere propiedades.stock", "stock_properties_required")
    capacity = stock.get("capacity")
    initial_quantity = stock.get("initial_quantity")
    unit = stock.get("unit")
    if isinstance(capacity, bool) or not isinstance(capacity, int) or capacity <= 0:
        raise ProcessModelingError("stock.capacity debe ser un entero positivo", "invalid_stock_capacity")
    if isinstance(initial_quantity, bool) or not isinstance(initial_quantity, int) or initial_quantity < 0 or initial_quantity > capacity:
        raise ProcessModelingError("stock.initial_quantity debe estar entre cero y capacity", "invalid_stock_quantity")
    if not isinstance(unit, str) or not unit.strip():
        raise ProcessModelingError("stock.unit es obligatorio", "invalid_stock_unit")
    return {"capacity": capacity, "initial_quantity": initial_quantity, "unit": unit.strip()}
