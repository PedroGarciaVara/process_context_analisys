from uc_bib_solv.modules.bpm.domain.processes.payload_rules import validate_process_payload


class CreateOperationalProcess:
    """Create a process after applying BPM payload rules."""

    def __init__(self, process_port):
        self.process_port = process_port

    def execute(self, payload):
        return self.process_port.create_process(validate_process_payload(payload))
