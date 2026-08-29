class DeleteContract:
    """Delete a contract and its managed associations."""

    def __init__(self, contract_port):
        self.contract_port = contract_port

    def execute(self, contract_id):
        return self.contract_port.delete_contract(contract_id)
