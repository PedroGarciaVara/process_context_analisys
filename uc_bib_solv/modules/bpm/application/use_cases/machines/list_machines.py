class ListMachines:
    """List machines in a BPM process, contract or operation scope."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, process_id=None, contract_id=None, operation_id=None, process_version_id=None, bpm_process_id=None):
        return self.persistence.list_machines(
            process_id,
            contract_id,
            operation_id,
            process_version_id,
            bpm_process_id,
        )
