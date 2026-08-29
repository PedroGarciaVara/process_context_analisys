from uc_bib_solv.modules.bpm.domain.contracts.entities import Contract


class UpdateContract:
    """Update editable contract information."""

    def __init__(self, contract_port):
        self.contract_port = contract_port

    def execute(self, contract_id, payload):
        current = self.contract_port.get_contract(contract_id)
        if not current:
            raise ValueError("Contrato no encontrado.")
        contract = Contract.from_persistence(current)
        contract.apply_update(payload)
        return self.contract_port.update_contract(contract_id, contract.to_payload())
