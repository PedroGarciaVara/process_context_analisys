class ListConfigurations:
    """List machine-operation configurations."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, machine_id):
        return self.persistence.list_configurations(int(machine_id))
