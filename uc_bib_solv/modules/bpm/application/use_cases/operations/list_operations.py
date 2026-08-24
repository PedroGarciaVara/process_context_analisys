class ListOperations:
    """List operation nodes for a BPM version."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, version_id=None):
        catalog = self.persistence.get_operational_catalog(version_id)
        scopes = catalog.get("data", {}).get("contractScopes", {})
        return scopes.get("operations", [])
