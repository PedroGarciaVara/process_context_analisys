class GetOperationMachines:
    def __init__(self, query_port):
        self.query_port = query_port

    def execute(self, operation_id, process_id=None):
        return self.query_port.get_operation_machines(operation_id, process_id)
