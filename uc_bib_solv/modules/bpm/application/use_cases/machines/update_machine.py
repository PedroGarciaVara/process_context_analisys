from uc_bib_solv.modules.bpm.domain.machines.entities import Machine
from uc_bib_solv.modules.bpm.domain.machines.payload_rules import validate_machine_payload
from uc_bib_solv.modules.bpm.application.dto.commands import MachineCommand


class UpdateMachine:
    """Update editable machine data."""

    def __init__(self, machine_port):
        self.machine_port = machine_port

    def execute(self, machine_id, payload):
        validated = validate_machine_payload(payload, partial=True)
        if "name" in validated:
            command = MachineCommand.from_payload(validated)
            Machine(
                id=int(machine_id),
                name=command.name,
                machine_type_id=command.machine_type_id,
                specific_description=command.specific_description,
            )
        return self.machine_port.update_machine(machine_id, validated)
