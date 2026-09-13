"""PostgreSQL composition adapter for BPM operational aggregates.

The existing repositories remain the SQL owners.  This adapter gives the BPM
application one explicit composition point for machines, contracts, their
associations and machine-operation configurations while preserving the current
operational projections and HTTP behavior.
"""

from __future__ import annotations

from uc_bib_solv.modules.bpm.application.ports.operational_persistence import (
    ContractRepositoryPort,
    MachineContractAssociationPort,
    MachineOperationConfigurationPort,
    MachineRepositoryPort,
)
from .mappers import BpmOperationalMapper


class BpmOperationalPostgresAdapter:
    """Compose low-level BPM repositories and operational projections."""

    machines: MachineRepositoryPort
    contracts: ContractRepositoryPort
    machine_contracts: MachineContractAssociationPort
    configurations: MachineOperationConfigurationPort

    def __init__(
        self,
        backend=None,
        connection_factory=None,
        *,
        machines: MachineRepositoryPort | None = None,
        contracts: ContractRepositoryPort | None = None,
        machine_contracts: MachineContractAssociationPort | None = None,
        configurations: MachineOperationConfigurationPort | None = None,
    ):
        missing = [name for name, value in (("backend", backend), ("machines", machines), ("contracts", contracts), ("machine_contracts", machine_contracts), ("configurations", configurations)) if value is None]
        if missing:
            raise ValueError(f"El adaptador operacional BPM requiere dependencias inyectadas: {', '.join(missing)}")
        self._backend = backend
        self.connection_factory = connection_factory
        self.machines = machines
        self.contracts = contracts
        self.machine_contracts = machine_contracts
        self.configurations = configurations

    @property
    def backend(self):
        return self._backend

    # Application-facing projections.  Keeping these explicit prevents the
    # application layer from reaching into repositories through __getattr__.
    def list_processes(self): return BpmOperationalMapper.row(self.backend.list_processes())
    def list_operations(self, process_id=None): return BpmOperationalMapper.row(self.backend.list_operations(process_id))
    def list_contracts(self, process_id=None, status=None): return [BpmOperationalMapper.contract(item) for item in self.backend.list_contracts(process_id, status)]
    def get_contract(self, contract_id): return BpmOperationalMapper.contract(self.contracts.get_by_id(int(contract_id)))
    def create_contract(self, payload): return BpmOperationalMapper.contract(self.backend.create_contract(payload))
    def update_contract(self, contract_id, payload): return BpmOperationalMapper.contract(self.backend.update_contract(contract_id, payload))
    def toggle_contract(self, contract_id): return self.backend.toggle_contract(contract_id)
    def delete_contract(self, contract_id): return self.backend.delete_contract(contract_id)
    def get_contract_machines(self, contract_id): return BpmOperationalMapper.row(self.backend.get_contract_machines(contract_id))
    def get_operation_machines(self, operation_id, process_id=None): return BpmOperationalMapper.row(self.backend.get_operation_machines(operation_id, process_id))
    def save_contract_machines(self, contract_id, payload): return self.backend.save_contract_machines(contract_id, payload)
    def replace_operation_machines(self, operation_id, payload): return self.backend.replace_operation_machines(operation_id, payload)
    def list_machines(self, process_id=None, contract_id=None, operation_id=None, bpm_process_id=None):
        return BpmOperationalMapper.machines(self.backend.list_machines(process_id, contract_id, operation_id, bpm_process_id))
    def get_machine(self, machine_id): return BpmOperationalMapper.machine(self.machines.get_by_id(int(machine_id)))
    def create_machine(self, payload): return BpmOperationalMapper.machine(self.backend.create_machine(payload))
    def update_machine(self, machine_id, payload): return BpmOperationalMapper.machine(self.backend.update_machine(machine_id, payload))
    def delete_machine(self, machine_id): return self.backend.delete_machine(machine_id)
    def get_machine_context(self, machine_id, operation_id=None, process_id=None):
        return BpmOperationalMapper.machine(self.backend.get_machine_context(machine_id, operation_id, process_id))
    def list_configurations(self, machine_id): return BpmOperationalMapper.row(self.backend.list_configurations(machine_id))
    def create_configuration(self, payload): return BpmOperationalMapper.row(self.backend.create_configuration(payload))
    def get_operational_catalog(self, process_id=None): return BpmOperationalMapper.row(self.backend.get_operational_catalog(process_id))
    def get_operational_page_payload(self, page, params=None): return BpmOperationalMapper.row(self.backend.get_operational_page_payload(page, params))
