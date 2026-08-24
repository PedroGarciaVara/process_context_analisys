class DeleteContract:
    """Delete a contract and its managed associations."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, contract_id):
        return self.persistence.delete_contract(contract_id)
