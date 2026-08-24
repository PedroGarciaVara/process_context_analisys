"""Compatibility route facade; endpoint handling lives in the canonical inbound adapter."""

from uc_bib_solv.modules.bpm.process_modeling.adapters.inbound.http.routes import create_process_modeling_blueprint
from uc_bib_solv.modules.bpm.process_modeling.infrastructure.wiring import create_process_modeling_handlers

service = create_process_modeling_handlers()

bp = create_process_modeling_blueprint(service)

__all__ = ["bp", "service"]
