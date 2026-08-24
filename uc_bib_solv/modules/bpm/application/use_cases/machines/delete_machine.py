class DeleteMachine:
    """Delete a machine through the BPM persistence port."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, machine_id):
        return self.persistence.delete_machine(machine_id)
