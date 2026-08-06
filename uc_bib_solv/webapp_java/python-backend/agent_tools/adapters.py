from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


class BackendGateway(Protocol):
    """Minimal application-facing port; concrete services are injected at the edge."""

    def process_catalog(self) -> Any: ...
    def process(self, process_id: Any) -> Any: ...
    def version(self, version_id: Any, expand_node_id: Any = None) -> Any: ...
    def context(self, version_id: Any, node_id: Any = None, family: Any = None, record_type: Any = None) -> Any: ...
    def tree(self, view: str, contract_id: int | None = None) -> Any: ...
    def machine_context(self, machine_id: int) -> Any: ...
    def contracts(self, process_id: Any = None) -> Any: ...
    def calculate_kpi(self, payload: dict[str, Any]) -> Any: ...


@dataclass
class ExistingBackendGateway:
    """Production adapter reusing current application services/repositories."""

    def __post_init__(self) -> None:
        from repositories import causas_repository, machine_model_repository, operational_repository
        from services import process_modeling_service

        self._causas = causas_repository
        self._machines = machine_model_repository
        self._operational = operational_repository
        self._process_modeling = process_modeling_service

    def process_catalog(self):
        return self._process_modeling.list_processes()

    def process(self, process_id):
        return self._process_modeling.get_process(process_id)

    def version(self, version_id, expand_node_id=None):
        return self._process_modeling.get_version(version_id, expand_node_id)

    def context(self, version_id, node_id=None, family=None, record_type=None):
        return self._process_modeling.get_context(version_id, node_id, family, record_type)

    def tree(self, view, contract_id=None):
        return self._causas.get_tree_payload(view=view, contract_id=contract_id)

    def machine_context(self, machine_id):
        return self._machines.get_machine_context(machine_id)

    def contracts(self, process_id=None):
        return self._operational.list_contracts(process_id=process_id)

    def calculate_kpi(self, payload):
        return self._process_modeling.calculate_context_kpi(payload)
