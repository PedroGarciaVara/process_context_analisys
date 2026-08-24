"""Compatibility shim for the canonical causal-analysis persistence adapter."""

from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import build_rca_tree_analysis_persistence


_default_adapter = build_rca_tree_analysis_persistence()


def create(contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura):
    return _default_adapter.create_legacy(contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura)


def get_by_id(analisis_causa_id): return _default_adapter.get_by_id(analisis_causa_id)
def get_by_contrato(contrato_id, estado=None): return _default_adapter.get_by_contrato(contrato_id, estado)
def get_open_by_contrato(contrato_id): return _default_adapter.get_open_by_contrato(contrato_id)
def update_estado(analisis_causa_id, estado): return _default_adapter.update_estado(analisis_causa_id, estado)
def list_summary(): return _default_adapter.list_summary()
