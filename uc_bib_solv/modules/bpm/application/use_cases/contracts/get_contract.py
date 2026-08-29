class GetContract:
    """Find one contract through the contract application port."""

    def __init__(self, contract_port):
        self.contract_port = contract_port

    def execute(self, contract_id):
        expected = str(contract_id)
        return next(
            (
                item
                for item in self.contract_port.list_contracts()
                if str(item.get("id", item.get("contract_id"))) == expected
            ),
            None,
        )
