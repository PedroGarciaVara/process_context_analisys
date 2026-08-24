class CreateConfiguration:
    """Create a machine-operation configuration."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, payload):
        return self.persistence.create_configuration(payload)
