from uc_bib_solv.modules.bpm.domain.machines.entities import Machine
from uc_bib_solv.modules.bpm.domain.machines.payload_rules import validate_machine_payload
from uc_bib_solv.modules.bpm.application.dto.commands import MachineCommand


class CreateMachine:
    """Create a machine after validating its BPM payload."""

    def __init__(self, machine_port):
        self.machine_port = machine_port

    def execute(self, payload):
        validated = validate_machine_payload(payload)
        validated.setdefault("specific_description", validated.get("description"))
        command = MachineCommand.from_payload(validated)
        Machine(
            id=None,
            name=command.name,
            machine_type_id=command.machine_type_id,
            specific_description=command.specific_description,
        )
        return self.machine_port.create_machine(validated)
