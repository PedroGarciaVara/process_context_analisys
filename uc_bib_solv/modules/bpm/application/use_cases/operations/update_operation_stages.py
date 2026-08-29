class UpdateOperationStages:
    """Persist the stages belonging to an operation node."""

    def __init__(self, operations_port):
        self.operations_port = operations_port

    def execute(self, operation_id, payload):
        return self.operations_port.update_operation_stages(operation_id, payload)
