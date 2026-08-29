"""Application-facing repository for RCA_TREE analysis-result details."""

from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import build_rca_tree_analysis_persistence


_adapter = build_rca_tree_analysis_persistence()


def upsert(analysis_id, element_type, evaluation, comment=None, cause_id=None, hypothesis_id=None):
    return _adapter.upsert_detail(analysis_id, element_type, evaluation, comment, cause_id, hypothesis_id)


def list_by_analysis(analysis_id): return _adapter.list_details(analysis_id)
def get_for_cause(analysis_id, cause_id): return _adapter.get_detail(analysis_id, "causa", cause_id)
def get_for_hypothesis(analysis_id, hypothesis_id): return _adapter.get_detail(analysis_id, "hipotesis", hypothesis_id)
