class ListOperationalProcesses:
    """List the canonical operational BPM processes."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self):
        return self.persistence.list_processes()
