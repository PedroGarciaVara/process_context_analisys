from uc_bib_solv.modules.bpm.application.dto.commands import OperationMachineAssociationCommand


class ReplaceOperationMachines:
    """Replace the canonical membership set of a BPM operation."""

    def __init__(self, association_port):
        self.association_port = association_port

    def execute(self, operation_id, payload):
        command = OperationMachineAssociationCommand.from_payload(payload)
        return self.association_port.replace_operation_machines(
            operation_id,
            {"machine_ids": command.machine_ids, "process_id": command.process_id, "contract_id": command.contract_id},
        )
