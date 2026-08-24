from uc_bib_solv.modules.bpm.domain.entities import Machine
from uc_bib_solv.modules.bpm.domain.validators import validate_machine_payload


class CreateMachine:
    """Create a machine after validating its BPM payload."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, payload):
        validated = validate_machine_payload(payload)
        Machine(
            machine_id=None,
            name=validated["name"],
            machine_type_id=validated.get("machine_type_id"),
            description=validated.get("description"),
        )
        return self.persistence.create_machine(validated)
