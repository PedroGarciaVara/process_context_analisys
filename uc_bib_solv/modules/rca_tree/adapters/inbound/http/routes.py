"""Canonical HTTP adapter for the RCA_TREE bounded context."""

from flask import Blueprint, request

from uc_bib_solv.modules.rca_tree.infrastructure.wiring import build_rca_tree_service
from uc_bib_solv.modules.rca_tree.domain.exceptions import CausalTreeError, CausalTreeNotFoundError, CausalTreeStateError, CausalTreeValidationError
from uc_bib_solv.utils.http import error, ok


def create_blueprint(service=None, analysis_service=None):
    service = service or build_rca_tree_service()
    bp = Blueprint("rca_tree_http", __name__)

    def json_payload():
        return request.get_json(silent=True) or {}

    @bp.get("/api/rca-tree/nodes")
    def nodes():
        try:
            return ok(service.get_tree_payload(request.args.get("view", "arbol"), _integer(request.args.get("selected_cause_id")), _float(request.args.get("zoom", "1.0")), _integer(request.args.get("contract_id"))))
        except Exception as exc:
            return _handle_exception(exc)

    @bp.get("/api/rca-tree/tree")
    def tree():
        return nodes()

    @bp.get("/api/rca-tree/causes/detail")
    def cause_detail():
        try:
            return ok(service.get_detail_payload(request.args))
        except Exception as exc:
            return _handle_exception(exc)

    @bp.get("/api/rca-tree/causes/<int:cause_id>")
    def cause_by_id(cause_id):
        return ok(service.get_detail_payload({"causa_id": cause_id}))

    @bp.get("/api/rca-tree/causes/<int:cause_id>/hypotheses")
    def cause_hypotheses(cause_id):
        return ok(service.list_hypotheses(cause_id))

    @bp.post("/api/rca-tree/causes")
    def cause_create():
        try:
            payload = json_payload()
            if (payload.get("editor_mode") or "").strip() == "new_contract":
                return ok(service.create_contract_node(payload), status_code=201)
            return ok(service.save_cause(payload), status_code=201)
        except Exception as exc:
            return _handle_exception(exc)

    @bp.patch("/api/rca-tree/causes/<int:cause_id>")
    def cause_update(cause_id):
        try:
            payload = json_payload()
            payload["causa_id"] = cause_id
            return ok(service.save_cause(payload))
        except Exception as exc:
            return error(str(exc), status_code=400)

    @bp.delete("/api/rca-tree/causes/<int:cause_id>")
    def cause_delete(cause_id):
        try:
            return ok(service.delete_cause(cause_id))
        except Exception as exc:
            return _handle_exception(exc)

    @bp.get("/api/rca-tree/causes/reusable/search")
    def reusable_search():
        try:
            return ok(service.search_reusable_nodes(request.args))
        except Exception as exc:
            return _handle_exception(exc)

    @bp.post("/api/rca-tree/causes/reusable/link")
    def reusable_link():
        try:
            return ok(service.link_reusable_node(json_payload()), status_code=201)
        except Exception as exc:
            return _handle_exception(exc)

    @bp.post("/api/rca-tree/causes/<int:cause_id>/hypotheses")
    def hypothesis_create(cause_id):
        try:
            payload = json_payload()
            payload["cause_id"] = cause_id
            return ok(service.save_hypothesis(payload), status_code=201)
        except Exception as exc:
            return _handle_exception(exc)

    @bp.patch("/api/rca-tree/hypotheses/<int:hypothesis_id>")
    def hypothesis_update(hypothesis_id):
        try:
            payload = json_payload()
            payload["hypothesis_id"] = hypothesis_id
            return ok(service.save_hypothesis(payload))
        except Exception as exc:
            return error(str(exc), status_code=400)

    @bp.get("/api/rca-tree/hypotheses/<int:hypothesis_id>/delete-preview")
    def hypothesis_delete_preview(hypothesis_id):
        try:
            return ok(service.get_delete_preview(hypothesis_id))
        except Exception as exc:
            return _handle_exception(exc)

    @bp.delete("/api/rca-tree/hypotheses/<int:hypothesis_id>")
    def hypothesis_delete(hypothesis_id):
        try:
            return ok(service.delete_hypothesis(hypothesis_id))
        except Exception as exc:
            return _handle_exception(exc)

    if analysis_service is not None:
        @bp.get("/api/rca-tree/analyses")
        def analyses():
            try:
                return ok({"status": "ok", "data": analysis_service.list_recent(request.args.get("limit", 20), request.args.get("status"), request.args.get("q"))})
            except Exception as exc:
                return _handle_exception(exc)

        @bp.get("/api/rca-tree/analyses/templates")
        def analysis_templates():
            try:
                process_id = request.args.get("process_id")
                return ok({"status": "ok", "data": analysis_service.list_templates(int(process_id) if process_id else None)})
            except Exception as exc:
                return _handle_exception(exc)

        @bp.post("/api/rca-tree/analyses")
        def analysis_create():
            try:
                return ok({"status": "ok", "data": analysis_service.create(json_payload())}, status_code=201)
            except Exception as exc:
                return _handle_exception(exc)

        @bp.get("/api/rca-tree/analyses/<int:analysis_id>")
        def analysis_detail(analysis_id):
            analysis = analysis_service.get(analysis_id)
            return ok({"status": "ok", "data": analysis}) if analysis else error("Analisis no encontrado.", status_code=404)

        @bp.patch("/api/rca-tree/analyses/<int:analysis_id>")
        def analysis_update(analysis_id):
            try:
                return ok({"status": "ok", "data": analysis_service.update(analysis_id, json_payload())})
            except Exception as exc:
                return _handle_exception(exc)

        @bp.post("/api/rca-tree/analyses/<int:analysis_id>/results")
        def analysis_result(analysis_id):
            try:
                return ok({"status": "ok", "data": analysis_service.save_result(analysis_id, json_payload())}, status_code=201)
            except Exception as exc:
                return _handle_exception(exc)

    return bp


def _handle_exception(exc: Exception):
    """Translate domain failures centrally without hiding unexpected errors as 4xx."""
    if isinstance(exc, CausalTreeNotFoundError):
        return error(str(exc), status_code=404)
    if isinstance(exc, CausalTreeStateError):
        return error(str(exc), status_code=409)
    if isinstance(exc, (CausalTreeValidationError, CausalTreeError, TypeError, ValueError, KeyError)):
        return error(str(exc), status_code=400)
    return error("Error interno del árbol causal.", status_code=500)


def _integer(value):
    if value in (None, "", "null"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 1.0


__all__ = ["create_blueprint"]
