"""Narrow outbound ports used by the operational BPM use cases."""

from dataclasses import dataclass
from typing import Any, Protocol


class OperationalProcessPort(Protocol):
    def list_processes(self) -> list[dict[str, Any]]: ...
    def create_process(self, payload: dict[str, Any]) -> dict[str, Any]: ...
    def update_process(self, process_id: int, payload: dict[str, Any]) -> dict[str, Any]: ...
    def delete_process(self, process_id: int) -> bool: ...


class OperationalOperationsPort(Protocol):
    def get_operational_catalog(self, process_id: str | None = None) -> dict[str, Any]: ...
    def update_operation_stages(self, operation_id, payload): ...


class OperationalContractPort(Protocol):
    def list_contracts(self, process_id=None, status=None) -> list[dict[str, Any]]: ...
    def get_contract(self, contract_id): ...
    def create_contract(self, payload): ...
    def update_contract(self, contract_id, payload): ...
    def toggle_contract(self, contract_id): ...
    def delete_contract(self, contract_id): ...


class OperationalAssociationPort(Protocol):
    def get_contract_machines(self, contract_id): ...
    def save_contract_machines(self, contract_id, payload): ...


class OperationalMachinePort(Protocol):
    def list_machines(self, process_id=None, contract_id=None, operation_id=None, process_id_bpm=None, bpm_process_id=None): ...
    def create_machine(self, payload): ...
    def update_machine(self, machine_id, payload): ...
    def delete_machine(self, machine_id): ...


class OperationalMachineContextPort(Protocol):
    def get_machine_context(self, machine_id, operation_id=None, process_id=None): ...


class OperationalConfigurationPort(Protocol):
    def list_configurations(self, machine_id): ...
    def create_configuration(self, payload): ...


class OperationalPagePort(Protocol):
    def get_operational_page_payload(self, page, params=None): ...


@dataclass(frozen=True)
class BpmOperationalDependencies:
    """Typed composition of capability ports; never a generic persistence object."""

    processes: OperationalProcessPort
    operations: OperationalOperationsPort
    contracts: OperationalContractPort
    associations: OperationalAssociationPort
    machines: OperationalMachinePort
    machine_context: OperationalMachineContextPort
    configurations: OperationalConfigurationPort
    catalog: OperationalOperationsPort
    pages: OperationalPagePort

    @staticmethod
    def narrow(port, *methods):
        """Build the smallest runtime capability view for one use case."""
        return Capability(port, *methods)

    @classmethod
    def from_legacy_backend(cls, backend):
        """Compatibility seam for old fakes, kept at composition boundary."""
        return cls(
            processes=Capability(backend, "list_processes", "create_process", "update_process", "delete_process"),
            operations=Capability(backend, "get_operational_catalog"),
            contracts=Capability(backend, "list_contracts", "get_contract", "create_contract", "update_contract", "toggle_contract", "delete_contract"),
            associations=Capability(backend, "get_contract_machines", "save_contract_machines"),
            machines=Capability(backend, "list_machines", "create_machine", "update_machine", "delete_machine"),
            machine_context=Capability(backend, "get_machine_context"),
            configurations=Capability(backend, "list_configurations", "create_configuration"),
            catalog=Capability(backend, "get_operational_catalog"),
            pages=Capability(backend, "get_operational_page_payload"),
        )


class Capability:
    def __init__(self, target, *methods):
        self._target = target
        self._methods = frozenset(methods)

    def __getattr__(self, name):
        if name not in self._methods:
            raise AttributeError(name)
        return getattr(self._target, name)
