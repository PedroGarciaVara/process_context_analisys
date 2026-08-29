from uc_bib_solv.modules.bpm.domain.machines.entities import Machine


class UpdateMachine:
    """Update editable machine data."""

    def __init__(self, machine_port):
        self.machine_port = machine_port

    def execute(self, machine_id, payload):
        current = self.machine_port.get_machine(machine_id)
        if not current:
            raise ValueError("Máquina no encontrada.")
        machine = Machine.from_persistence(current)
        machine.apply_update(payload)
        return self.machine_port.update_machine(machine_id, machine.to_update_payload())
