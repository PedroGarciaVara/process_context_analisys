class GetOperationalPage:
    """Build a page projection for the operational BPM UI."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, page, params=None):
        return self.persistence.get_operational_page_payload(page, params)
