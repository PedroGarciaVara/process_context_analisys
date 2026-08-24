from uc_bib_solv.modules.bpm.domain.machines.operational_entities import Machine
from uc_bib_solv.modules.bpm.domain.machines.payload_rules import validate_machine_payload


class UpdateMachine:
    """Update editable machine data."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, machine_id, payload):
        validated = validate_machine_payload(payload, partial=True)
        if "name" in validated:
            Machine(
                machine_id=int(machine_id),
                name=validated["name"],
                machine_type_id=validated.get("machine_type_id"),
                description=validated.get("description"),
            )
        return self.persistence.update_machine(machine_id, validated)
