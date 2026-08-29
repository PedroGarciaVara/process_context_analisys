class GetContractMachines:
    """Read the machines available and assigned to a contract."""

    def __init__(self, association_port):
        self.association_port = association_port

    def execute(self, contract_id):
        return self.association_port.get_contract_machines(contract_id)
