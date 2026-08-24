"""Flask inbound adapter for Process Modeling."""
from flask import Blueprint, request

from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from uc_bib_solv.utils.http import error, ok


def create_process_modeling_blueprint(handlers):
    bp = Blueprint("process_modeling", __name__)

    def call(name, *args):
        try:
            return ok({"status": "ok", "data": getattr(handlers, name)(*args)})
        except NotFoundError as exc:
            return error(str(exc), 404, code=exc.code)
        except ProcessModelingError as exc:
            return error(str(exc), 400, code=exc.code)
        except ValueError as exc:
            return error(str(exc), 400, code="invalid_input")
        except Exception:
            return error("No se pudo completar la operación", 409, code="persistence_error")

    def payload():
        return request.get_json(silent=True) or {}

    def created(response):
        response.status_code = 201 if response.status_code == 200 else response.status_code
        return response

    routes = [
        ("/api/process-modeling/processes", "list_processes", "GET", lambda: call("list_processes")),
        ("/api/process-modeling/processes", "create_process", "POST", lambda: created(call("create_process", payload()))),
        ("/api/process-modeling/processes/<process_id>", "get_process", "GET", lambda process_id: call("get_process", process_id)),
        ("/api/process-modeling/processes/<process_id>/versions", "list_versions", "GET", lambda process_id: call("list_versions", process_id)),
        ("/api/process-modeling/processes/<process_id>/versions", "create_version", "POST", lambda process_id: created(call("create_version", process_id, payload()))),
        ("/api/process-modeling/versions/<version_id>", "get_version", "GET", lambda version_id: call("get_version", version_id, request.args.get("expand_node_id"))),
        ("/api/process-modeling/versions/<version_id>", "update_version", "PATCH", lambda version_id: call("update_version", version_id, payload())),
        ("/api/process-modeling/versions/<version_id>/nodes", "create_node", "POST", lambda version_id: created(call("create_node", version_id, payload()))),
        ("/api/process-modeling/versions/<version_id>/operations", "create_operation", "POST", lambda version_id: created(call("create_operation", version_id, payload()))),
        ("/api/process-modeling/nodes/<node_id>", "update_node", "PATCH", lambda node_id: call("update_node", node_id, payload())),
        ("/api/process-modeling/nodes/<node_id>", "delete_node", "DELETE", lambda node_id: call("delete_node", node_id)),
        ("/api/process-modeling/nodes/<node_id>/metadata", "get_node_metadata", "GET", lambda node_id: call("get_node_metadata", node_id)),
        ("/api/process-modeling/nodes/<node_id>/metadata", "update_node_metadata", "PATCH", lambda node_id: call("update_node_metadata", node_id, payload())),
        ("/api/process-modeling/operations/<operation_id>", "get_operation", "GET", lambda operation_id: call("get_operation", operation_id)),
        ("/api/process-modeling/operations/<operation_id>", "delete_operation", "DELETE", lambda operation_id: call("delete_operation", operation_id)),
        ("/api/process-modeling/operations/<operation_id>/stages", "update_operation_stages", "PATCH", lambda operation_id: call("update_operation_stages", operation_id, payload())),
        ("/api/process-modeling/versions/<version_id>/context", "get_context", "GET", lambda version_id: call("get_context", version_id, request.args.get("node_id"), request.args.get("family"), request.args.get("record_type"))),
        ("/api/process-modeling/nodes/<node_id>/context-records", "create_context_record", "POST", lambda node_id: created(call("create_context_record", node_id, payload()))),
        ("/api/process-modeling/kpis", "calculate_kpi", "POST", lambda: call("calculate_context_kpi", payload())),
        ("/api/process-modeling/versions/<version_id>/transitions", "create_transition", "POST", lambda version_id: created(call("create_transition", version_id, payload()))),
        ("/api/process-modeling/transitions/<transition_id>", "delete_transition", "DELETE", lambda transition_id: call("delete_transition", transition_id)),
        ("/api/process-modeling/versions/<version_id>/validate", "validate_version", "POST", lambda version_id: call("validate_version", version_id)),
    ]
    for rule, endpoint, method, view in routes:
        bp.add_url_rule(rule, endpoint, view_func=view, methods=[method])
    return bp


__all__ = ["create_process_modeling_blueprint"]
