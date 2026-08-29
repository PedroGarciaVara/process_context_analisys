"""Machine aggregate entities."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .validators import validate_configuration_payload, validate_machine_payload, validate_machine_type_payload


@dataclass
class MachineType:
    id: int | None = None
    name: str = ""
    operating_principle: str = ""
    general_technical_description: str = ""
    technology_description: str | None = None
    nominal_capacity: dict[str, Any] | None = None
    elements_zones_positions: list[Any] | None = None
    control_systems: list[Any] | None = None
    common_technical_characteristics: Any = None
    common_limitations: Any = None

    def __post_init__(self):
        validated = validate_machine_type_payload(self.__dict__)
        for key, value in validated.items():
            setattr(self, key, value)


@dataclass
class Machine:
    id: int | None = None
    name: str = ""
    machine_type_id: int | None = None
    contract_id: int | None = None
    specific_description: str | None = None
    specific_characteristics: Any = None
    specific_parameters: Any = None
    specific_operating_ranges: Any = None
    specific_limitations: Any = None
    specific_instructions: Any = None
    differences_from_machine_type: Any = None

    def __post_init__(self):
        # A machine can be constructed before its type is persisted (the
        # create flow receives a nested machine_type payload).  The payload
        # boundary enforces the required type; the entity validates its own
        # fields without introducing a second operational Machine contract.
        validated = validate_machine_payload(self.__dict__, partial=True)
        for key, value in validated.items():
            setattr(self, key, value)

    @classmethod
    def from_persistence(cls, data: dict[str, Any]) -> "Machine":
        """Rehydrate the canonical machine from the persistence row shape."""
        values = dict(data)
        values.setdefault("name", values.pop("nombre", ""))
        values.setdefault("machine_type_id", values.pop("maquinas_tipo_id", None))
        values.pop("operational_status", None)
        return cls(**{key: value for key, value in values.items() if key in cls.__dataclass_fields__})

    def apply_update(self, payload: dict[str, Any]) -> None:
        """Apply and validate a partial modification on the entity itself."""
        validated = validate_machine_payload(payload, partial=True)
        for key, value in validated.items():
            setattr(self, key, value)

    def to_update_payload(self) -> dict[str, Any]:
        """Return the canonical writable state expected by the persistence port."""
        return {key: value for key, value in self.__dict__.items() if key not in {"id", "contract_id"}}

    def to_create_payload(self) -> dict[str, Any]:
        """Return the canonical writable state for machine creation."""
        return {key: value for key, value in self.__dict__.items() if key != "id"}

    def rename(self, name: str) -> None:
        validated = validate_machine_payload({"name": name}, partial=True)
        self.name = validated["name"]

    def assign_contract(self, contract_id: int | None) -> None:
        if contract_id is not None and (isinstance(contract_id, bool) or int(contract_id) <= 0):
            raise ValueError("contract_id debe ser un entero positivo")
        self.contract_id = int(contract_id) if contract_id is not None else None


@dataclass
class MachineOperationConfiguration:
    id: int | None = None
    machine_id: int | None = None
    operation_id: str = ""
    process_id: str = ""
    contract_id: int | None = None
    validation_status: str = "draft"
    valid_from: Any = None
    valid_to: Any = None
    specific_description: str | None = None
    additional_inputs: list[Any] = field(default_factory=list)
    specific_controls: list[Any] = field(default_factory=list)
    available_measurements: list[Any] = field(default_factory=list)
    specific_safety_rules: list[Any] = field(default_factory=list)

    def __post_init__(self):
        validated = validate_configuration_payload(self.__dict__)
        for key, value in validated.items():
            setattr(self, key, value)

    def change_validation_status(self, status: str) -> None:
        """Change lifecycle status through the configuration aggregate."""
        validated = validate_configuration_payload(
            {"machine_id": self.machine_id, "operation_id": self.operation_id,
             "process_id": self.process_id, "validation_status": status}
        )
        self.validation_status = validated["validation_status"]

    def to_create_payload(self) -> dict[str, Any]:
        """Return only the normalized writable state for persistence."""
        return {key: value for key, value in self.__dict__.items() if key != "id"}

    def identity_key(self) -> tuple[int, str, str]:
        """Return the database uniqueness identity for this configuration."""
        return (int(self.machine_id), self.process_id, self.operation_id)
