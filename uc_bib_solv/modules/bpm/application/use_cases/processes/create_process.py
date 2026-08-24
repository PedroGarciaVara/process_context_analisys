from uc_bib_solv.modules.bpm.domain.validators import validate_process_payload


class CreateProcess:
    """Create a process after applying BPM payload rules."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, payload):
        return self.persistence.create_process(validate_process_payload(payload))
