class ListMachines:
    """List machines in a BPM process, contract or operation scope."""

    def __init__(self, machine_port):
        self.machine_port = machine_port

    def execute(self, process_id=None, contract_id=None, operation_id=None, process_id_bpm=None, bpm_process_id=None):
        return self.machine_port.list_machines(
            process_id,
            contract_id,
            operation_id,
            process_id_bpm,
            bpm_process_id,
        )
