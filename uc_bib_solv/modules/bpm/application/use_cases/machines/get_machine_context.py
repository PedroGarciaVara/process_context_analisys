class GetMachineContext:
    """Read machine context for an operation and BPM version."""

    def __init__(self, machine_context_port):
        self.machine_context_port = machine_context_port

    def execute(self, machine_id, operation_id=None, process_id=None):
        return self.machine_context_port.get_machine_context(machine_id, operation_id, process_id)
