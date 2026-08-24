class GetContractMachines:
    """Read the machines available and assigned to a contract."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, contract_id):
        return self.persistence.get_contract_machines(contract_id)
