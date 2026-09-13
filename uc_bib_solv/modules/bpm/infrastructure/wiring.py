"""Composition root for the BPM bounded context."""

from ..adapters.outbound.operational_postgres import BpmOperationalPostgresAdapter
from ..application import BpmOperationalApplication
from ..application.process_modeling_application import ProcessModelingApplication
from ..adapters.outbound.bpm_persistence import BpmPostgresPersistenceAdapter
from ..application.ports.operational_capabilities import BpmOperationalDependencies


def build_bpm_operational_application(*, persistence=None):
    adapter = persistence or build_bpm_operational_postgres_adapter()
    return BpmOperationalApplication(_operational_dependencies(adapter))


def _operational_dependencies(adapter):
    narrow = BpmOperationalDependencies.narrow
    return BpmOperationalDependencies(
        processes=narrow(adapter, "list_processes"),
        operations=narrow(adapter, "list_operations"),
        contract_queries=narrow(adapter, "list_contracts", "get_contract"),
        contract_commands=narrow(adapter, "create_contract", "get_contract", "update_contract", "toggle_contract", "delete_contract"),
        association_queries=narrow(adapter, "get_contract_machines", "get_operation_machines"),
        association_commands=narrow(adapter, "save_contract_machines", "replace_operation_machines"),
        machine_queries=narrow(adapter, "get_machine", "list_machines"),
        machine_commands=narrow(adapter, "create_machine", "get_machine", "update_machine", "delete_machine"),
        machine_context=narrow(adapter, "get_machine_context"),
        configuration_queries=narrow(adapter, "list_configurations"),
        configuration_commands=narrow(adapter, "create_configuration"),
        catalog=narrow(adapter, "get_operational_catalog"),
        pages=narrow(adapter, "get_operational_page_payload"),
    )


def build_bpm_process_modeling_application(handler):
    """Compose process-modeling use cases from explicit repository ports."""
    return ProcessModelingApplication(handler.processes, handler.nodes, handler.transitions, handler.layouts)


def build_bpm_postgres_persistence_adapter(*, connection_factory=None):
    """Compose the temporary SQL repositories only at the infrastructure edge."""
    from uc_bib_solv.modules.bpm.adapters.outbound.postgres.pm_layout_repo import ProcessLayoutRepository
    from uc_bib_solv.modules.bpm.adapters.outbound.postgres.pm_process_repo import NodeRepository, ProcessRepository, TransitionRepository

    return BpmPostgresPersistenceAdapter(
        processes=ProcessRepository(),
        nodes=NodeRepository(),
        transitions=TransitionRepository(),
        layouts=ProcessLayoutRepository(),
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
