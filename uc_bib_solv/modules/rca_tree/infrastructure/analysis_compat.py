"""Legacy analysis repository shim; SQL lives in the canonical adapter."""

from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import (
    build_rca_tree_analysis_service as build_causal_analysis_service,
)


def list_templates(process_id=None): return build_causal_analysis_service().list_templates(process_id)
def list_recent(limit=20, status=None, search=None): return build_causal_analysis_service().list_recent(limit, status, search)
def create_analysis(payload): return build_causal_analysis_service().create(payload)
def update_analysis(analysis_id, payload): return build_causal_analysis_service().update(analysis_id, payload)
def save_result(analysis_id, payload): return build_causal_analysis_service().save_result(analysis_id, payload)
def get_analysis(analysis_id): return build_causal_analysis_service().get(analysis_id)
