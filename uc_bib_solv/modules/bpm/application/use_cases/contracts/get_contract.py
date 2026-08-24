class GetContract:
    """Find one contract through the contract application port."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, contract_id):
        expected = str(contract_id)
        return next(
            (
                item
                for item in self.persistence.list_contracts()
                if str(item.get("id", item.get("contract_id"))) == expected
            ),
            None,
        )
