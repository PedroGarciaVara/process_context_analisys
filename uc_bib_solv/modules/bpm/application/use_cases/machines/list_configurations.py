class ListConfigurations:
    """List machine-operation configurations."""

    def __init__(self, configuration_port):
        self.configuration_port = configuration_port

    def execute(self, machine_id):
        return self.configuration_port.list_configurations(int(machine_id))
