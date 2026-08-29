from uc_bib_solv.modules.bpm.domain.contracts.entities import Contract
from uc_bib_solv.modules.bpm.domain.contracts.rules import validate_contract_payload


class CreateContract:
    """Create a contract with exactly one valid BPM scope."""

    def __init__(self, contract_port):
        self.contract_port = contract_port

    def execute(self, payload):
        validated = validate_contract_payload(payload)
        contract = Contract(
            contract_id=None,
            name=validated["name"],
            bpm_process_id=validated.get("bpm_process_id"),
            bpm_node_id=validated.get("bpm_node_id"),
            process_id=validated.get("process_id"),
            metric=validated.get("metrica"),
            objective=validated.get("objetivo"),
        )
        canonical = dict(validated)
        canonical.update(contract.to_payload())
        return self.contract_port.create_contract(canonical)
