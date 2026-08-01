from flask import Blueprint, request

from repositories.analysis_repository import create_analysis, get_analysis, list_recent, list_templates, save_result, update_analysis
from utils.http import error, ok

bp = Blueprint("analysis", __name__)


@bp.get("/api/analyses")
def analyses():
    try:
        return ok({"status": "ok", "data": list_recent(request.args.get("limit", 20), request.args.get("status"), request.args.get("q"))})
    except (TypeError, ValueError) as exc:
        return error(str(exc), status_code=400)


@bp.get("/api/analysis-templates")
def analysis_templates():
    try:
        process_id = request.args.get("process_id")
        return ok({"status": "ok", "data": list_templates(int(process_id) if process_id else None)})
    except (TypeError, ValueError) as exc:
        return error(str(exc), status_code=400)


@bp.post("/api/analyses")
def analysis_create():
    try:
        return ok({"status": "ok", "data": create_analysis(request.get_json(silent=True) or {})}, status_code=201)
    except (TypeError, ValueError, KeyError) as exc:
        return error(str(exc), status_code=400)


@bp.get("/api/analyses/<int:analysis_id>")
def analysis_detail(analysis_id: int):
    analysis = get_analysis(analysis_id)
    return ok({"status": "ok", "data": analysis}) if analysis else error("Analisis no encontrado.", status_code=404)


@bp.patch("/api/analyses/<int:analysis_id>")
def analysis_update(analysis_id: int):
    try:
        return ok({"status": "ok", "data": update_analysis(analysis_id, request.get_json(silent=True) or {})})
    except (TypeError, ValueError) as exc:
        return error(str(exc), status_code=400)


@bp.post("/api/analyses/<int:analysis_id>/results")
def analysis_result(analysis_id: int):
    try:
        return ok({"status": "ok", "data": save_result(analysis_id, request.get_json(silent=True) or {})}, status_code=201)
    except (TypeError, ValueError) as exc:
        return error(str(exc), status_code=400)
