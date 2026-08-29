from uc_bib_solv.modules.bpm.domain.contracts.entities import Contract
from uc_bib_solv.modules.bpm.application.dto.commands import ContractCommand
from uc_bib_solv.modules.bpm.domain.contracts.rules import validate_contract_payload


class CreateContract:
    """Create a contract with exactly one valid BPM scope."""

    def __init__(self, contract_port):
        self.contract_port = contract_port

    def execute(self, payload):
        validated = validate_contract_payload(payload)
        command = ContractCommand.from_payload(validated)
        Contract(
            contract_id=None,
            name=command.name,
            bpm_process_id=command.bpm_process_id,
            bpm_node_id=command.bpm_node_id,
            process_id=command.process_id,
            metric=command.metrica,
            objective=command.objetivo,
        )
        return self.contract_port.create_contract(validated)
