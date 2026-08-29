class ListContracts:
    """List contracts in a process and status scope."""

    def __init__(self, contract_port):
        self.contract_port = contract_port

    def execute(self, process_id=None, status=None):
        return self.contract_port.list_contracts(process_id, status)
