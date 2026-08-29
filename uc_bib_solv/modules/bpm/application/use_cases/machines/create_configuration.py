from uc_bib_solv.modules.bpm.application.dto.commands import ConfigurationCommand
from uc_bib_solv.modules.bpm.domain.machines.entities import MachineOperationConfiguration


class CreateConfiguration:
    """Create a machine-operation configuration."""

    def __init__(self, configuration_port):
        self.configuration_port = configuration_port

    def execute(self, payload):
        command = ConfigurationCommand.from_payload(payload)
        MachineOperationConfiguration(**command.to_dict())
        return self.configuration_port.create_configuration(payload)
