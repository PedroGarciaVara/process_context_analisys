class DeleteMachine:
    """Delete a machine through the BPM persistence port."""

    def __init__(self, machine_port):
        self.machine_port = machine_port

    def execute(self, machine_id):
        return self.machine_port.delete_machine(machine_id)
