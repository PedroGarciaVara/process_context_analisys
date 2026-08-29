class ListOperations:
    """List operation nodes across canonical BPM processes."""

    def __init__(self, operations_port):
        self.operations_port = operations_port

    def execute(self, process_id=None):
        catalog = self.operations_port.get_operational_catalog(process_id)
        scopes = catalog.get("data", {}).get("contractScopes", {})
        return scopes.get("operations", [])
