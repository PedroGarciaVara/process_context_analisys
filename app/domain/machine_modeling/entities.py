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
    operational_status: str = "unknown"
    specific_description: str | None = None
    specific_characteristics: Any = None
    specific_parameters: Any = None
    specific_operating_ranges: Any = None
    specific_limitations: Any = None
    specific_instructions: Any = None
    differences_from_machine_type: Any = None

    def __post_init__(self):
        validated = validate_machine_payload(self.__dict__)
        for key, value in validated.items():
            setattr(self, key, value)


@dataclass
class MachineOperationConfiguration:
    id: int | None = None
    machine_id: int | None = None
    operation_id: str = ""
    process_version_id: str = ""
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
