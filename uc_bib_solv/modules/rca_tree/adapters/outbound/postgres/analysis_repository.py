"""Application-facing repository for RCA_TREE analysis persistence."""

from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import build_rca_tree_analysis_persistence


_adapter = build_rca_tree_analysis_persistence()


def create(contract_id, process_id, machine_id, initializer, opening_description):
    return _adapter.create({
        "contract_id": contract_id,
        "process_id": process_id,
        "machine_id": machine_id,
        "participants": [initializer],
        "indication": opening_description,
    })


def get_by_id(analysis_id): return _adapter.get(analysis_id)
def list_by_contract(contract_id, status=None): return _adapter.list_by_contract(contract_id, status)
def get_open_by_contract(contract_id): return _adapter.get_open_by_contract(contract_id)
def update_status(analysis_id, status): return _adapter.update_status(analysis_id, status)
def list_summary(): return _adapter.list_summary()
