"""Compatibility facade for the canonical causal-analysis inbound adapter."""

from flask import Blueprint, request

from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import (
    build_rca_tree_analysis_service as build_causal_analysis_service,
)
from uc_bib_solv.utils.http import error, ok

bp = Blueprint("analysis", __name__)
_service_instance = None


def _service():
    global _service_instance
    if _service_instance is None: _service_instance = build_causal_analysis_service()
    return _service_instance


def list_recent(limit=20, status=None, search=None): return _service().list_recent(limit, status, search)
def list_templates(process_id=None): return _service().list_templates(process_id)
def create_analysis(payload): return _service().create(payload)
def get_analysis(analysis_id): return _service().get(analysis_id)
def update_analysis(analysis_id, payload): return _service().update(analysis_id, payload)
def save_result(analysis_id, payload): return _service().save_result(analysis_id, payload)


@bp.get("/api/analyses")
def analyses():
    try: return ok({"status": "ok", "data": list_recent(request.args.get("limit", 20), request.args.get("status"), request.args.get("q"))})
    except (TypeError, ValueError) as exc: return error(str(exc), status_code=400)


@bp.get("/api/analysis-templates")
def analysis_templates():
    try:
        process_id = request.args.get("process_id")
        return ok({"status": "ok", "data": list_templates(int(process_id) if process_id else None)})
    except (TypeError, ValueError) as exc: return error(str(exc), status_code=400)


@bp.post("/api/analyses")
def analysis_create():
    try: return ok({"status": "ok", "data": create_analysis(request.get_json(silent=True) or {})}, status_code=201)
    except (TypeError, ValueError, KeyError) as exc: return error(str(exc), status_code=400)


@bp.get("/api/analyses/<int:analysis_id>")
def analysis_detail(analysis_id):
    analysis = get_analysis(analysis_id)
    return ok({"status": "ok", "data": analysis}) if analysis else error("Analisis no encontrado.", status_code=404)


@bp.patch("/api/analyses/<int:analysis_id>")
def analysis_update(analysis_id):
    try: return ok({"status": "ok", "data": update_analysis(analysis_id, request.get_json(silent=True) or {})})
    except (TypeError, ValueError) as exc: return error(str(exc), status_code=400)


@bp.post("/api/analyses/<int:analysis_id>/results")
def analysis_result(analysis_id):
    try: return ok({"status": "ok", "data": save_result(analysis_id, request.get_json(silent=True) or {})}, status_code=201)
    except (TypeError, ValueError) as exc: return error(str(exc), status_code=400)
