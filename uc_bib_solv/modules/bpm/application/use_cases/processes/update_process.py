from uc_bib_solv.modules.bpm.domain.processes.payload_rules import validate_process_payload


class UpdateProcess:
    """Update a process through the BPM persistence port."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, process_id, payload):
        return self.persistence.update_process(process_id, validate_process_payload(payload))
