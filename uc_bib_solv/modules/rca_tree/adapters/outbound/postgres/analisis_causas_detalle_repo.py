"""Compatibility shim for analysis-detail persistence."""

from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import build_rca_tree_analysis_persistence


_default_adapter = build_rca_tree_analysis_persistence()


def upsert(analisis_causa_id, tipo_elemento, evaluacion, comentario=None, causa_id=None, hipotesis_id=None):
    return _default_adapter.upsert_detail(analisis_causa_id, tipo_elemento, evaluacion, comentario, causa_id, hipotesis_id)


def get_by_analisis(analisis_causa_id): return _default_adapter.list_details(analisis_causa_id)
def get_for_causa(analisis_causa_id, causa_id): return _default_adapter.get_detail(analisis_causa_id, "causa", causa_id)
def get_for_hipotesis(analisis_causa_id, hipotesis_id): return _default_adapter.get_detail(analisis_causa_id, "hipotesis", hipotesis_id)
