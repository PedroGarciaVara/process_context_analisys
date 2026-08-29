from uc_bib_solv.modules.bpm.domain.processes.payload_rules import validate_process_payload


class UpdateOperationalProcess:
    """Update a process through the BPM persistence port."""

    def __init__(self, process_port):
        self.process_port = process_port

    def execute(self, process_id, payload):
        return self.process_port.update_process(process_id, validate_process_payload(payload))
