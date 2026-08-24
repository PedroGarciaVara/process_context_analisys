from flask import Blueprint, request

from uc_bib_solv.modules.rca_tree.infrastructure.wiring import build_rca_tree_service
from uc_bib_solv.utils.http import error, ok

bp = Blueprint("causas", __name__)


_causal_tree_service = None


def _service():
    global _causal_tree_service
    if _causal_tree_service is None:
        _causal_tree_service = build_rca_tree_service()
    return _causal_tree_service


# Compatibility names are deliberately kept at the HTTP boundary so existing
# route tests and consumers can patch the public call sites while all runtime
# work is delegated to the canonical application service.
def get_tree_payload(view, selected_cause_id=None, zoom=1.0, contract_id=None):
    return _service().get_tree_payload(view, selected_cause_id, zoom, contract_id)


def get_detail_payload(params):
    return _service().get_detail_payload(params)


def save_cause(payload):
    return _service().save_cause(payload)


def save_hypothesis(payload):
    return _service().save_hypothesis(payload)


def list_hypotheses(causa_id):
    return _service().list_hypotheses(causa_id)


def delete_causa_record(causa_id):
    return _service().delete_cause(causa_id)


def delete_hypothesis_record(hypothesis_id):
    return _service().delete_hypothesis(hypothesis_id)


def create_contract_node(payload):
    return _service().create_contract_node(payload)


def search_reusable_nodes(params):
    return _service().search_reusable_nodes(params)


def link_reusable_node(payload):
    return _service().link_reusable_node(payload)


def get_delete_preview(hypothesis_id):
    return _service().get_delete_preview(hypothesis_id)


@bp.get("/causas")
@bp.get("/api/causas")
def causas():
  view = request.args.get("view", "arbol")
  selected_cause_id = request.args.get("selected_cause_id")
  contract_id = request.args.get("contract_id")
  zoom = request.args.get("zoom", "1.0")
  try:
    selected_cause_id = int(selected_cause_id) if selected_cause_id not in (None, "", "null") else None
  except ValueError:
    selected_cause_id = None
  try:
    contract_id = int(contract_id) if contract_id not in (None, "", "null") else None
  except ValueError:
    contract_id = None
  try:
    zoom_value = float(zoom)
  except ValueError:
    zoom_value = 1.0
  return ok(get_tree_payload(view, selected_cause_id=selected_cause_id, zoom=zoom_value, contract_id=contract_id))


@bp.get("/api/causas/detail")
def causa_detail():
    return ok(get_detail_payload(request.args))


@bp.get("/api/causas/<int:causa_id>")
def causa_detail_by_id(causa_id: int):
    return ok(get_detail_payload({"causa_id": causa_id}))


@bp.get("/api/causas/<int:causa_id>/hipotesis")
def causa_hipotesis(causa_id: int):
    return ok(list_hypotheses(causa_id))


@bp.post("/api/causas")
def create_causa():
    try:
        payload = request.get_json(silent=True) or {}
        if (payload.get("editor_mode") or "").strip() == "new_contract":
            return ok(create_contract_node(payload), status_code=201)
        return ok(save_cause(payload), status_code=201)
    except Exception as exc:
        return error(str(exc))


@bp.patch("/api/causas/<int:causa_id>")
def update_causa(causa_id: int):
    try:
        payload = request.get_json(silent=True) or {}
        payload["causa_id"] = causa_id
        return ok(save_cause(payload))
    except Exception as exc:
        return error(str(exc))


@bp.delete("/api/causas/<int:causa_id>")
def delete_causa(causa_id: int):
    try:
        return ok(delete_causa_record(causa_id))
    except Exception as exc:
        return error(str(exc), status_code=404)


@bp.get("/api/causas/reusable/search")
def reusable_nodes_search():
    try:
        return ok(search_reusable_nodes(request.args))
    except Exception as exc:
        return error(str(exc))


@bp.post("/api/causas/reusable/link")
def reusable_node_link():
    try:
        return ok(link_reusable_node(request.get_json(silent=True) or {}), status_code=201)
    except Exception as exc:
        return error(str(exc))


@bp.post("/api/causas/<int:causa_id>/hipotesis")
def create_hipotesis(causa_id: int):
    try:
        payload = request.get_json(silent=True) or {}
        payload["cause_id"] = causa_id
        return ok(save_hypothesis(payload), status_code=201)
    except Exception as exc:
        return error(str(exc))


@bp.patch("/api/hipotesis/<int:hipotesis_id>")
def update_hipotesis(hipotesis_id: int):
    try:
        payload = request.get_json(silent=True) or {}
        payload["hypothesis_id"] = hipotesis_id
        return ok(save_hypothesis(payload))
    except Exception as exc:
        return error(str(exc))


@bp.get("/api/hipotesis/<int:hipotesis_id>/delete-preview")
def hipotesis_delete_preview(hipotesis_id: int):
    try:
        return ok(get_delete_preview(hipotesis_id))
    except Exception as exc:
        return error(str(exc), status_code=404)


@bp.delete("/api/hipotesis/<int:hipotesis_id>")
def delete_hipotesis(hipotesis_id: int):
    try:
        return ok(delete_hypothesis_record(hipotesis_id))
    except Exception as exc:
        return error(str(exc), status_code=404)
