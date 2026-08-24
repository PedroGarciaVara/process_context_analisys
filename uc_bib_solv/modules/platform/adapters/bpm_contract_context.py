"""Platform bridge for RCA_TREE requests that need BPM contract references.

The bridge keeps RCA_TREE independent from BPM repositories. Composition is
owned here, at the platform boundary, and only reference-shaped operations
are exposed to the causal adapters.
"""

from uc_bib_solv.modules.bpm.adapters.outbound.postgres import contrato_repo


def get_contract(contract_id: int):
    return contrato_repo.get_by_id(int(contract_id))


def list_contracts():
    return contrato_repo.get_all()


def create_contract(process_id, name, metric=None, objective=None, bpm_process_id=None, bpm_node_id=None):
    return contrato_repo.create(process_id, name, metric, objective, bpm_process_id, bpm_node_id)


__all__ = ["get_contract", "list_contracts", "create_contract"]

