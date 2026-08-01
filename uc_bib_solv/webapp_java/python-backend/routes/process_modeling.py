from __future__ import annotations

from flask import Blueprint, request

from app.domain.process_modeling.exceptions import NotFoundError, ProcessModelingError
from services import process_modeling_service as service
from utils.http import error, ok

bp = Blueprint("process_modeling", __name__)


def _payload():
    return request.get_json(silent=True) or {}


def _call(action, *args):
    try:
        return ok({"status": "ok", "data": action(*args)})
    except NotFoundError as exc:
        return error(str(exc), 404, code=exc.code)
    except ProcessModelingError as exc:
        return error(str(exc), 400, code=exc.code)
    except ValueError as exc:
        return error(str(exc), 400, code="invalid_input")
    except Exception:
        return error("No se pudo completar la operación", 409, code="persistence_error")


@bp.get("/api/process-modeling/processes")
def list_processes():
    return _call(service.list_processes)


@bp.post("/api/process-modeling/processes")
def create_process():
    response = _call(service.create_process, _payload())
    response.status_code = 201 if response.status_code == 200 else response.status_code
    return response


@bp.get("/api/process-modeling/processes/<process_id>")
def get_process(process_id):
    return _call(service.get_process, process_id)


@bp.post("/api/process-modeling/processes/<process_id>/versions")
def create_version(process_id):
    response = _call(service.create_version, process_id, _payload())
    response.status_code = 201 if response.status_code == 200 else response.status_code
    return response


@bp.get("/api/process-modeling/versions/<version_id>")
def get_version(version_id):
    expand_node_id = request.args.get("expand_node_id")
    return _call(service.get_version, version_id, expand_node_id) if expand_node_id else _call(service.get_version, version_id)


@bp.get("/api/process-modeling/processes/<process_id>/versions")
def list_versions(process_id):
    return _call(service.list_versions, process_id)


@bp.patch("/api/process-modeling/versions/<version_id>")
def update_version(version_id):
    return _call(service.update_version, version_id, _payload())


@bp.post("/api/process-modeling/versions/<version_id>/nodes")
def create_node(version_id):
    response = _call(service.create_node, version_id, _payload())
    response.status_code = 201 if response.status_code == 200 else response.status_code
    return response


@bp.patch("/api/process-modeling/nodes/<node_id>")
def update_node(node_id):
    return _call(service.update_node, node_id, _payload())


@bp.delete("/api/process-modeling/nodes/<node_id>")
def delete_node(node_id):
    return _call(service.delete_node, node_id)


@bp.get("/api/process-modeling/nodes/<node_id>/metadata")
def get_node_metadata(node_id):
    return _call(service.get_node_metadata, node_id)


@bp.patch("/api/process-modeling/nodes/<node_id>/metadata")
def update_node_metadata(node_id):
    return _call(service.update_node_metadata, node_id, _payload())


@bp.post("/api/process-modeling/versions/<version_id>/transitions")
def create_transition(version_id):
    response = _call(service.create_transition, version_id, _payload())
    response.status_code = 201 if response.status_code == 200 else response.status_code
    return response


@bp.delete("/api/process-modeling/transitions/<transition_id>")
def delete_transition(transition_id):
    return _call(service.delete_transition, transition_id)


@bp.post("/api/process-modeling/versions/<version_id>/validate")
def validate_version(version_id):
    return _call(service.validate_version, version_id)
