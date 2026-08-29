from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ExistingBackendGateway:
    """Concrete compatibility adapter for current backend services."""

    def __post_init__(self) -> None:
        from uc_bib_solv.modules.rca_tree.infrastructure.wiring import build_rca_tree_application
        from uc_bib_solv.modules.bpm.infrastructure.wiring import build_bpm_operational_service
        from uc_bib_solv.modules.bpm.infrastructure.process_modeling_wiring import create_process_modeling_handlers

        operational = build_bpm_operational_service()
        self._causas = build_rca_tree_application()
        self._machines = operational
        self._operational = operational
        self._process_modeling = create_process_modeling_handlers()

    def process_catalog(self):
        return self._process_modeling.list_processes()

    def process(self, process_id):
        return self._process_modeling.get_process(process_id)

    def context(self, process_id, node_id=None, family=None, record_type=None):
        return self._process_modeling.get_context(process_id, node_id, family, record_type)

    def tree(self, view, contract_id=None):
        return self._causas.get_tree_payload(view=view, contract_id=contract_id)

    def machine_context(self, machine_id):
        return self._machines.get_machine_context(machine_id)

    def contracts(self, process_id=None):
        return self._operational.list_contracts(process_id=process_id)

    def calculate_kpi(self, payload):
        return self._process_modeling.calculate_context_kpi(payload)
