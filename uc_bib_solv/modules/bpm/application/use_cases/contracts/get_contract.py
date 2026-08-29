class GetContract:
    """Find one contract through the contract application port."""

    def __init__(self, contract_port):
        self.contract_port = contract_port

    def execute(self, contract_id):
        return self.contract_port.get_contract(contract_id)
