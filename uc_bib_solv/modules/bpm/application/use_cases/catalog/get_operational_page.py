class GetOperationalPage:
    """Build a page projection for the operational BPM UI."""

    def __init__(self, page_port):
        self.page_port = page_port

    def execute(self, page, params=None):
        return self.page_port.get_operational_page_payload(page, params)
