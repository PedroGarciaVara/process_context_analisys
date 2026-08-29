"""Composition root for the BPM bounded context."""

from ..adapters.outbound.operational_postgres import BpmOperationalPostgresAdapter
from ..application import BpmOperationalApplication
from ..application.process_modeling_application import ProcessModelingApplication
from ..adapters.outbound.bpm_persistence import BpmPostgresPersistenceAdapter
from ..application.ports.operational_capabilities import BpmOperationalDependencies


class BpmOperationalService:
    def __init__(self, use_cases):
        self.use_cases = use_cases

    def list_processes(self): return self.use_cases.list_processes()
    def list_operations(self, process_id=None): return self.use_cases.list_operations(process_id)
    def list_contracts(self, process_id=None, status=None): return self.use_cases.list_contracts(process_id, status)
    def get_contract(self, contract_id): return self.use_cases.get_contract(contract_id)
    def create_process(self, payload): return self.use_cases.create_process(payload)
    def update_process(self, process_id, payload): return self.use_cases.update_process(process_id, payload)
    def delete_process(self, process_id): return self.use_cases.delete_process(process_id)
    def create_contract(self, payload): return self.use_cases.create_contract(payload)
    def update_contract(self, contract_id, payload): return self.use_cases.update_contract(contract_id, payload)
    def toggle_contract(self, contract_id): return self.use_cases.toggle_contract(contract_id)
    def delete_contract(self, contract_id): return self.use_cases.delete_contract(contract_id)
    def get_contract_machines(self, contract_id): return self.use_cases.get_contract_machines(contract_id)
    def save_contract_machines(self, contract_id, payload): return self.use_cases.save_contract_machines(contract_id, payload)
    def list_machines(self, process_id=None, contract_id=None, operation_id=None, process_id_bpm=None, bpm_process_id=None):
        return self.use_cases.list_machines(process_id, contract_id, operation_id, process_id_bpm, bpm_process_id)
    def create_machine(self, payload): return self.use_cases.create_machine(payload)
    def update_machine(self, machine_id, payload): return self.use_cases.update_machine(machine_id, payload)
    def delete_machine(self, machine_id): return self.use_cases.delete_machine(machine_id)
    def get_machine_context(self, machine_id, operation_id=None, process_id=None):
        return self.use_cases.get_machine_context(machine_id, operation_id, process_id)
    def list_configurations(self, machine_id): return self.use_cases.list_configurations(machine_id)
    def create_configuration(self, payload): return self.use_cases.create_configuration(payload)
    def get_operational_catalog(self, process_id=None): return self.use_cases.get_catalog(process_id)
    def get_operational_page_payload(self, page, params=None): return self.use_cases.get_page(page, params)
    def get_catalog(self, process_id=None): return self.use_cases.get_catalog(process_id)
    def get_page(self, page, params=None): return self.use_cases.get_page(page, params)


def build_bpm_operational_service(*, persistence=None):
    adapter = persistence or build_bpm_operational_postgres_adapter()
    return BpmOperationalService(BpmOperationalApplication(BpmOperationalDependencies.from_legacy_backend(adapter)))


def build_bpm_process_modeling_application(handler):
    """Compose process-modeling use cases from explicit repository ports."""
    return ProcessModelingApplication(handler.processes, handler.nodes, handler.transitions)


def build_bpm_postgres_persistence_adapter(*, connection_factory=None):
    """Compose the temporary SQL repositories only at the infrastructure edge."""
    from uc_bib_solv.modules.bpm.adapters.outbound.postgres.pm_process_repo import NodeRepository, ProcessRepository, TransitionRepository

    return BpmPostgresPersistenceAdapter(
        processes=ProcessRepository(),
        nodes=NodeRepository(),
        transitions=TransitionRepository(),
        connection_factory=connection_factory,
    )


def build_bpm_operational_postgres_adapter(*, backend=None, connection_factory=None):
    """Compose operational SQL/projection repositories at the infrastructure edge."""
    from uc_bib_solv.modules.bpm.adapters.outbound.postgres import contrato_repo, maquina_repo, machine_model_repo
    from uc_bib_solv.modules.bpm.adapters.outbound.postgres import operational_repository

    from ..adapters.outbound.operational_postgres import BpmOperationalPostgresAdapter

    return BpmOperationalPostgresAdapter(
        backend=backend or operational_repository,
        connection_factory=connection_factory,
        machines=maquina_repo,
        contracts=contrato_repo,
        machine_contracts=contrato_repo,
        configurations=machine_model_repo,
    )


def build_bpm_contract_context_port():
    """Expose the narrow contract port from the BPM composition edge."""
    from uc_bib_solv.modules.bpm.adapters.outbound.postgres import contrato_repo

    return contrato_repo


class OperationalService(BpmOperationalService):
    """Compatibility name for the BPM operational service."""


def build_operational_service(*, persistence=None):
    adapter = persistence or build_bpm_operational_postgres_adapter()
    return OperationalService(BpmOperationalApplication(BpmOperationalDependencies.from_legacy_backend(adapter)))


_operational_service = None


def operational_service():
    global _operational_service
    if _operational_service is None:
        _operational_service = build_operational_service()
    return _operational_service


def create_contract(payload): return operational_service().create_contract(payload)
def update_contract(contract_id, payload): return operational_service().update_contract(contract_id, payload)
def toggle_contract(contract_id): return operational_service().toggle_contract(contract_id)
def delete_contract(contract_id): return operational_service().delete_contract(contract_id)
def get_contract_machines(contract_id): return operational_service().get_contract_machines(contract_id)
def save_contract_machines(contract_id, payload): return operational_service().save_contract_machines(contract_id, payload)
def create_machine(payload): return operational_service().create_machine(payload)
def update_machine(machine_id, payload): return operational_service().update_machine(machine_id, payload)
def delete_machine(machine_id): return operational_service().delete_machine(machine_id)
def create_process(payload): return operational_service().create_process(payload)
def update_process(process_id, payload): return operational_service().update_process(process_id, payload)
def delete_process(process_id): return operational_service().delete_process(process_id)
def get_operational_catalog(process_id=None): return operational_service().get_catalog(process_id)
def get_operational_page_payload(page, params=None): return operational_service().get_page(page, params)
def list_contracts(*args, **kwargs): return operational_service().list_contracts(*args, **kwargs)
def list_machines(*args, **kwargs): return operational_service().list_machines(*args, **kwargs)
def list_processes(): return operational_service().list_processes()
def get_machine_context(*args, **kwargs): return operational_service().get_machine_context(*args, **kwargs)
def list_configurations(machine_id): return operational_service().list_configurations(machine_id)
def create_configuration(payload): return operational_service().create_configuration(payload)
