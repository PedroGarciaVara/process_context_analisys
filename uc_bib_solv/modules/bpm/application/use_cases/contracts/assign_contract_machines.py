from uc_bib_solv.modules.bpm.domain.associations.entities import MachineContractAssociation


class AssignContractMachines:
    """Replace the machine associations of a contract."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, contract_id, payload):
        raw_ids = payload.get("machine_ids", payload.get("machineIds", [])) or []
        associations = [
            MachineContractAssociation(int(contract_id), int(machine_id))
            for machine_id in raw_ids
        ]
        return self.persistence.save_contract_machines(
            contract_id,
            {"machine_ids": [association.machine_id for association in associations]},
        )
