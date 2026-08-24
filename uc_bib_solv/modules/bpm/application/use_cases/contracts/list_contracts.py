class ListContracts:
    """List contracts in a process and status scope."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, process_id=None, status=None):
        return self.persistence.list_contracts(process_id, status)
