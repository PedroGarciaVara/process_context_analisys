"""Narrow outbound ports used by the operational BPM use cases."""

from dataclasses import dataclass
from typing import Any, Protocol


class OperationalProcessPort(Protocol):
    def list_processes(self) -> list[dict[str, Any]]: ...


class OperationalCatalogPort(Protocol):
    def get_operational_catalog(self, process_id: str | None = None) -> dict[str, Any]: ...


class OperationalOperationsPort(Protocol):
    def list_operations(self, process_id: str | None = None) -> list[dict[str, Any]]: ...


class OperationalContractQueryPort(Protocol):
    def list_contracts(self, process_id=None, status=None) -> list[dict[str, Any]]: ...
    def get_contract(self, contract_id): ...


class OperationalContractCommandPort(Protocol):
    def create_contract(self, payload): ...
    def update_contract(self, contract_id, payload): ...
    def toggle_contract(self, contract_id): ...
    def delete_contract(self, contract_id): ...


class OperationalAssociationQueryPort(Protocol):
    def get_contract_machines(self, contract_id): ...


class OperationalAssociationCommandPort(Protocol):
    def save_contract_machines(self, contract_id, payload): ...


class OperationalMachineQueryPort(Protocol):
    def get_machine(self, machine_id): ...
    def list_machines(self, process_id=None, contract_id=None, operation_id=None, bpm_process_id=None): ...


class OperationalMachineCommandPort(Protocol):
    def create_machine(self, payload): ...
    def update_machine(self, machine_id, payload): ...
    def delete_machine(self, machine_id): ...


class OperationalMachineContextPort(Protocol):
    def get_machine_context(self, machine_id, operation_id=None, process_id=None): ...


class OperationalConfigurationQueryPort(Protocol):
    def list_configurations(self, machine_id): ...


class OperationalConfigurationCommandPort(Protocol):
    def create_configuration(self, payload): ...


class OperationalPagePort(Protocol):
    def get_operational_page_payload(self, page, params=None): ...


@dataclass(frozen=True)
class BpmOperationalDependencies:
    """Typed composition of capability ports; never a generic persistence object."""

    processes: OperationalProcessPort
    operations: OperationalOperationsPort
    contract_queries: OperationalContractQueryPort
    contract_commands: OperationalContractCommandPort
    association_queries: OperationalAssociationQueryPort
    association_commands: OperationalAssociationCommandPort
    machine_queries: OperationalMachineQueryPort
    machine_commands: OperationalMachineCommandPort
    machine_context: OperationalMachineContextPort
    configuration_queries: OperationalConfigurationQueryPort
    configuration_commands: OperationalConfigurationCommandPort
    catalog: OperationalCatalogPort
    pages: OperationalPagePort

    @staticmethod
    def narrow(port, *methods):
        """Build the smallest runtime capability view for one use case."""
        return Capability(port, *methods)

class Capability:
    def __init__(self, target, *methods):
        self._target = target
        self._methods = frozenset(methods)

    def __getattr__(self, name):
        if name not in self._methods:
            raise AttributeError(name)
        return getattr(self._target, name)
