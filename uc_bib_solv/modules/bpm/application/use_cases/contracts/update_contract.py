from uc_bib_solv.modules.bpm.domain.validators import validate_name


class UpdateContract:
    """Update editable contract information."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, contract_id, payload):
        if "name" in payload:
            validate_name(payload.get("name"))
        return self.persistence.update_contract(contract_id, payload)
