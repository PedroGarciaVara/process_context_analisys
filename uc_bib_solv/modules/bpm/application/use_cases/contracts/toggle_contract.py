class ToggleContract:
    """Toggle the lifecycle state of a contract."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, contract_id):
        return self.persistence.toggle_contract(contract_id)
