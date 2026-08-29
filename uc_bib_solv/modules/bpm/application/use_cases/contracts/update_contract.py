from uc_bib_solv.modules.bpm.domain.contracts.rules import validate_name
from uc_bib_solv.modules.bpm.application.dto.commands import ContractCommand


class UpdateContract:
    """Update editable contract information."""

    def __init__(self, contract_port):
        self.contract_port = contract_port

    def execute(self, contract_id, payload):
        validated = dict(payload)
        if "name" in payload:
            command = ContractCommand.from_payload(payload)
            validate_name(command.name)
            validated["name"] = command.name
        return self.contract_port.update_contract(contract_id, validated)
