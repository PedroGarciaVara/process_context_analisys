class GetOperationalCatalog:
    """Build the BPM catalogue projection."""

    def __init__(self, catalog_port):
        self.catalog_port = catalog_port

    def execute(self, process_id=None):
        return self.catalog_port.get_operational_catalog(process_id)
