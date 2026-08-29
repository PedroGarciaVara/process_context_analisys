"""Injected bridge for RCA_TREE requests that need BPM contract references."""

from typing import Any

from uc_bib_solv.modules.bpm.application.ports.contract_context import ContractContextPort


class BpmContractContextAdapter:
    """Expose only the narrow BPM contract port to platform consumers."""

    def __init__(self, contract_port: ContractContextPort):
        self._contract_port = contract_port

    def get_contract(self, contract_id: int) -> dict[str, Any] | None:
        return self._contract_port.get_by_id(int(contract_id))

    def list_contracts(self) -> list[dict[str, Any]]:
        return self._contract_port.get_all()

    def create_contract(self, process_id, name, metric=None, objective=None, bpm_process_id=None, bpm_node_id=None):
        return self._contract_port.create(process_id, name, metric, objective, bpm_process_id, bpm_node_id)


def _injected_context_required():
    raise RuntimeError("El contexto de contratos BPM debe inyectarse desde el composition root.")


# Kept as patch points for legacy RCA_TREE repository tests. Production wiring
# uses BpmContractContextAdapter and never calls these compatibility functions.
def get_contract(contract_id: int):
    return _injected_context_required()


def list_contracts():
    return _injected_context_required()


def create_contract(process_id, name, metric=None, objective=None, bpm_process_id=None, bpm_node_id=None):
    return _injected_context_required()


__all__ = ["BpmContractContextAdapter", "get_contract", "list_contracts", "create_contract"]
