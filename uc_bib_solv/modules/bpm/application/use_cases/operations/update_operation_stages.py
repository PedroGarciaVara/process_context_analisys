class UpdateOperationStages:
    """Persist the stages belonging to an operation node."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, operation_id, payload):
        return self.persistence.update_operation_stages(operation_id, payload)
