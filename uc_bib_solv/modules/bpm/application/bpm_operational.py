"""Composed BPM application boundary for operational capabilities.

Each public method delegates to one named use-case object.  The composition
keeps the HTTP contract stable while making individual application actions
discoverable and independently testable.
"""

from .use_cases.catalog import GetOperationalCatalog, GetOperationalPage
from .use_cases.contracts import (
    AssignContractMachines,
    CreateContract,
    DeleteContract,
    GetContract,
    GetContractMachines,
    ListContracts,
    ToggleContract,
    UpdateContract,
)
from .use_cases.machines import (
    CreateConfiguration,
    CreateMachine,
    DeleteMachine,
    GetMachineContext,
    ListConfigurations,
    ListMachines,
    UpdateMachine,
)
from .use_cases.operations import ListOperations
from .use_cases.processes import CreateProcess, DeleteProcess, ListProcesses, UpdateProcess


class BpmOperationalApplication:
    """Compose named BPM use cases without containing domain logic."""

    def __init__(self, persistence):
        self.list_processes_use_case = ListProcesses(persistence)
        self.create_process_use_case = CreateProcess(persistence)
        self.update_process_use_case = UpdateProcess(persistence)
        self.delete_process_use_case = DeleteProcess(persistence)
        self.list_operations_use_case = ListOperations(persistence)
        self.get_operational_catalog_use_case = GetOperationalCatalog(persistence)
        self.get_operational_page_use_case = GetOperationalPage(persistence)
        self.list_contracts_use_case = ListContracts(persistence)
        self.get_contract_use_case = GetContract(persistence)
        self.create_contract_use_case = CreateContract(persistence)
        self.update_contract_use_case = UpdateContract(persistence)
        self.toggle_contract_use_case = ToggleContract(persistence)
        self.delete_contract_use_case = DeleteContract(persistence)
        self.get_contract_machines_use_case = GetContractMachines(persistence)
        self.assign_contract_machines_use_case = AssignContractMachines(persistence)
        self.list_machines_use_case = ListMachines(persistence)
        self.create_machine_use_case = CreateMachine(persistence)
        self.update_machine_use_case = UpdateMachine(persistence)
        self.delete_machine_use_case = DeleteMachine(persistence)
        self.get_machine_context_use_case = GetMachineContext(persistence)
        self.list_configurations_use_case = ListConfigurations(persistence)
        self.create_configuration_use_case = CreateConfiguration(persistence)

    def list_processes(self): return self.list_processes_use_case.execute()
    def list_contracts(self, process_id=None, status=None): return self.list_contracts_use_case.execute(process_id, status)
    def get_contract(self, contract_id): return self.get_contract_use_case.execute(contract_id)
    def list_operations(self, version_id=None): return self.list_operations_use_case.execute(version_id)
    def list_machines(self, *args): return self.list_machines_use_case.execute(*args)
    def get_catalog(self, version_id=None): return self.get_operational_catalog_use_case.execute(version_id)
    def get_page(self, page, params=None): return self.get_operational_page_use_case.execute(page, params)
    def create_process(self, payload): return self.create_process_use_case.execute(payload)
    def update_process(self, process_id, payload): return self.update_process_use_case.execute(process_id, payload)
    def delete_process(self, process_id): return self.delete_process_use_case.execute(process_id)
    def create_contract(self, payload): return self.create_contract_use_case.execute(payload)
    def update_contract(self, contract_id, payload): return self.update_contract_use_case.execute(contract_id, payload)
    def toggle_contract(self, contract_id): return self.toggle_contract_use_case.execute(contract_id)
    def delete_contract(self, contract_id): return self.delete_contract_use_case.execute(contract_id)
    def get_contract_machines(self, contract_id): return self.get_contract_machines_use_case.execute(contract_id)
    def save_contract_machines(self, contract_id, payload): return self.assign_contract_machines_use_case.execute(contract_id, payload)
    def create_machine(self, payload): return self.create_machine_use_case.execute(payload)
    def update_machine(self, machine_id, payload): return self.update_machine_use_case.execute(machine_id, payload)
    def delete_machine(self, machine_id): return self.delete_machine_use_case.execute(machine_id)
    def get_machine_context(self, machine_id, operation_id=None, process_version_id=None): return self.get_machine_context_use_case.execute(machine_id, operation_id, process_version_id)
    def list_configurations(self, machine_id): return self.list_configurations_use_case.execute(machine_id)
    def create_configuration(self, payload): return self.create_configuration_use_case.execute(payload)


__all__ = ["BpmOperationalApplication"]
