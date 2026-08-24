class GetOperationalCatalog:
    """Build the BPM catalogue projection."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, version_id=None):
        return self.persistence.get_operational_catalog(version_id)
