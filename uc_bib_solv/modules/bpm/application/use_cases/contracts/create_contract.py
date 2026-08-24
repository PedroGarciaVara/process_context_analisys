from uc_bib_solv.modules.bpm.domain.entities import Contract
from uc_bib_solv.modules.bpm.domain.validators import validate_contract_payload


class CreateContract:
    """Create a contract with exactly one valid BPM scope."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, payload):
        validated = validate_contract_payload(payload)
        Contract(
            contract_id=None,
            name=validated["name"],
            bpm_process_id=validated.get("bpm_process_id"),
            bpm_node_id=validated.get("bpm_node_id"),
            process_id=validated.get("process_id"),
            metric=validated.get("metrica"),
            objective=validated.get("objetivo"),
        )
        return self.persistence.create_contract(validated)
