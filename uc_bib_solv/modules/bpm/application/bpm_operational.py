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
from .use_cases.operations.replace_operation_machines import ReplaceOperationMachines
from .use_cases.operations.get_operation_machines import GetOperationMachines
from .use_cases.processes import ListOperationalProcesses
from .ports.operational_capabilities import BpmOperationalDependencies


class BpmOperationalApplication:
    """Compose named BPM use cases without containing domain logic."""

    def __init__(self, dependencies):
        if not isinstance(dependencies, BpmOperationalDependencies):
            raise TypeError("BpmOperationalApplication requiere BpmOperationalDependencies")
        self.dependencies = dependencies
        narrow = dependencies.narrow
        self.list_processes_use_case = ListOperationalProcesses(narrow(dependencies.processes, "list_processes"))
        self.list_operations_use_case = ListOperations(narrow(dependencies.operations, "list_operations"))
        self.replace_operation_machines_use_case = ReplaceOperationMachines(narrow(dependencies.association_commands, "replace_operation_machines"))
        self.get_operational_catalog_use_case = GetOperationalCatalog(narrow(dependencies.catalog, "get_operational_catalog"))
        self.get_operational_page_use_case = GetOperationalPage(narrow(dependencies.pages, "get_operational_page_payload"))
        self.list_contracts_use_case = ListContracts(narrow(dependencies.contract_queries, "list_contracts"))
        self.get_contract_use_case = GetContract(narrow(dependencies.contract_queries, "get_contract"))
        self.create_contract_use_case = CreateContract(narrow(dependencies.contract_commands, "create_contract"))
        self.update_contract_use_case = UpdateContract(narrow(dependencies.contract_commands, "get_contract", "update_contract"))
        self.toggle_contract_use_case = ToggleContract(narrow(dependencies.contract_commands, "toggle_contract"))
        self.delete_contract_use_case = DeleteContract(narrow(dependencies.contract_commands, "delete_contract"))
        self.get_contract_machines_use_case = GetContractMachines(narrow(dependencies.association_queries, "get_contract_machines"))
        self.get_operation_machines_use_case = GetOperationMachines(narrow(dependencies.association_queries, "get_operation_machines"))
        self.assign_contract_machines_use_case = AssignContractMachines(narrow(dependencies.association_commands, "save_contract_machines"))
        self.list_machines_use_case = ListMachines(narrow(dependencies.machine_queries, "list_machines"))
        self.create_machine_use_case = CreateMachine(narrow(dependencies.machine_commands, "create_machine"))
        self.update_machine_use_case = UpdateMachine(narrow(dependencies.machine_commands, "get_machine", "update_machine"))
        self.delete_machine_use_case = DeleteMachine(narrow(dependencies.machine_commands, "delete_machine"))
        self.get_machine_context_use_case = GetMachineContext(narrow(dependencies.machine_context, "get_machine_context"))
        self.list_configurations_use_case = ListConfigurations(narrow(dependencies.configuration_queries, "list_configurations"))
        self.create_configuration_use_case = CreateConfiguration(narrow(dependencies.configuration_commands, "create_configuration"))

    def list_processes(self): return self.list_processes_use_case.execute()
    def list_contracts(self, process_id=None, status=None): return self.list_contracts_use_case.execute(process_id, status)
    def get_contract(self, contract_id): return self.get_contract_use_case.execute(contract_id)
    def list_operations(self, process_id=None): return self.list_operations_use_case.execute(process_id)
    def replace_operation_machines(self, operation_id, payload): return self.replace_operation_machines_use_case.execute(operation_id, payload)
    def list_machines(
        self,
        process_id=None,
        contract_id=None,
        operation_id=None,
        bpm_process_id=None,
    ):
        return self.list_machines_use_case.execute(
            process_id,
            contract_id,
            operation_id,
            bpm_process_id,
        )
    def get_operational_catalog(self, process_id=None): return self.get_operational_catalog_use_case.execute(process_id)
    def get_operational_page_payload(self, page, params=None): return self.get_operational_page_use_case.execute(page, params)
    def create_contract(self, payload): return self.create_contract_use_case.execute(payload)
    def update_contract(self, contract_id, payload): return self.update_contract_use_case.execute(contract_id, payload)
    def toggle_contract(self, contract_id): return self.toggle_contract_use_case.execute(contract_id)
    def delete_contract(self, contract_id): return self.delete_contract_use_case.execute(contract_id)
    def get_contract_machines(self, contract_id): return self.get_contract_machines_use_case.execute(contract_id)
    def get_operation_machines(self, operation_id, process_id=None): return self.get_operation_machines_use_case.execute(operation_id, process_id)
    def save_contract_machines(self, contract_id, payload): return self.assign_contract_machines_use_case.execute(contract_id, payload)
    def create_machine(self, payload): return self.create_machine_use_case.execute(payload)
    def update_machine(self, machine_id, payload): return self.update_machine_use_case.execute(machine_id, payload)
    def delete_machine(self, machine_id): return self.delete_machine_use_case.execute(machine_id)
    def get_machine_context(self, machine_id, operation_id=None, process_id=None): return self.get_machine_context_use_case.execute(machine_id, operation_id, process_id)
    def list_configurations(self, machine_id): return self.list_configurations_use_case.execute(machine_id)
    def create_configuration(self, payload): return self.create_configuration_use_case.execute(payload)


__all__ = ["BpmOperationalApplication"]
