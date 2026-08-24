class GetMachineContext:
    """Read machine context for an operation and BPM version."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, machine_id, operation_id=None, process_version_id=None):
        return self.persistence.get_machine_context(machine_id, operation_id, process_version_id)
