from uc_bib_solv.modules.bpm.domain.associations.entities import MachineContractAssociation
from uc_bib_solv.modules.bpm.application.dto.commands import MachineAssociationCommand


class AssignContractMachines:
    """Replace the machine associations of a contract."""

    def __init__(self, association_port):
        self.association_port = association_port

    def execute(self, contract_id, payload):
        command = MachineAssociationCommand.from_payload(payload)
        associations = [
            MachineContractAssociation(int(contract_id), machine_id)
            for machine_id in command.machine_ids
        ]
        return self.association_port.save_contract_machines(
            contract_id,
            {"machine_ids": [association.machine_id for association in associations]},
        )
