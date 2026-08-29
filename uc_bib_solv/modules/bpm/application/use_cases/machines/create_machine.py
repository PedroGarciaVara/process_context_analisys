from uc_bib_solv.modules.bpm.domain.machines.entities import Machine
from uc_bib_solv.modules.bpm.domain.machines.payload_rules import validate_machine_payload


class CreateMachine:
    """Create a machine after validating its BPM payload."""

    def __init__(self, machine_port):
        self.machine_port = machine_port

    def execute(self, payload):
        validated = validate_machine_payload(payload)
        validated.setdefault("specific_description", validated.get("description"))
        entity_values = {key: value for key, value in validated.items() if key in Machine.__dataclass_fields__}
        machine = Machine(id=None, **entity_values)
        canonical = dict(validated)
        canonical.update(machine.to_create_payload())
        return self.machine_port.create_machine(canonical)
