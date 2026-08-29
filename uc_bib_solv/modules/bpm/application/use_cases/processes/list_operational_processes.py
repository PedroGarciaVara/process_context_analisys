class ListOperationalProcesses:
    """List the canonical operational BPM processes."""

    def __init__(self, process_port):
        self.process_port = process_port

    def execute(self):
        return self.process_port.list_processes()
