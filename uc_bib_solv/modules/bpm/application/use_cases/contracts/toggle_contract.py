class ToggleContract:
    """Toggle the lifecycle state of a contract."""

    def __init__(self, contract_port):
        self.contract_port = contract_port

    def execute(self, contract_id):
        return self.contract_port.toggle_contract(contract_id)
