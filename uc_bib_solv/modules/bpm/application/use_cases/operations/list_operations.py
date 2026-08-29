class ListOperations:
    """List operation nodes across canonical BPM processes."""

    def __init__(self, operations_port):
        self.operations_port = operations_port

    def execute(self, process_id=None):
        return self.operations_port.list_operations(process_id)
