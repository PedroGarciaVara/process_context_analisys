"""Operational machine entity kept separate from machine-type schemas."""

from __future__ import annotations

from typing import Any

from .validators import validate_machine_payload


class Machine:
    """Machine identity used by BPM operational use cases."""

    def __init__(self, machine_id: int | None, name: str, machine_type_id: int | None = None, contract_id: int | None = None, description: str | None = None, **fields: Any):
        payload = {
            "machine_id": machine_id,
            "name": name,
            "machine_type_id": machine_type_id,
            "contract_id": contract_id,
            "description": description,
            **fields,
        }
        validated = validate_machine_payload({"name": name, "machine_type_id": machine_type_id, **fields}, partial=True)
        self.machine_id = machine_id
        self.name = validated["name"]
        self.machine_type_id = validated.get("machine_type_id")
        self.contract_id = contract_id
        self.description = description
        self.__dict__.update({key: value for key, value in payload.items() if key not in self.__dict__ and value is not None})
