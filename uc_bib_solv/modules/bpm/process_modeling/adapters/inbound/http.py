"""Flask inbound adapter: routes only translate HTTP to injected handlers."""

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

    bp.add_url_rule("/api/process-modeling/processes", "list_processes", view_func=lambda: call("list_processes"), methods=["GET"])
    bp.add_url_rule("/api/process-modeling/processes", "create_process", view_func=lambda: created(call("create_process", payload())), methods=["POST"])
    bp.add_url_rule("/api/process-modeling/processes/<process_id>", "get_process", view_func=lambda process_id: call("get_process", process_id), methods=["GET"])
    bp.add_url_rule("/api/process-modeling/processes/<process_id>/versions", "list_versions", view_func=lambda process_id: call("list_versions", process_id), methods=["GET"])
    bp.add_url_rule("/api/process-modeling/processes/<process_id>/versions", "create_version", view_func=lambda process_id: created(call("create_version", process_id, payload())), methods=["POST"])
    bp.add_url_rule("/api/process-modeling/versions/<version_id>", "get_version", view_func=lambda version_id: call("get_version", version_id, request.args.get("expand_node_id")), methods=["GET"])
    bp.add_url_rule("/api/process-modeling/versions/<version_id>", "update_version", view_func=lambda version_id: call("update_version", version_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/process-modeling/versions/<version_id>/nodes", "create_node", view_func=lambda version_id: created(call("create_node", version_id, payload())), methods=["POST"])
    bp.add_url_rule("/api/process-modeling/versions/<version_id>/operations", "create_operation", view_func=lambda version_id: created(call("create_operation", version_id, payload())), methods=["POST"])
    bp.add_url_rule("/api/process-modeling/nodes/<node_id>", "update_node", view_func=lambda node_id: call("update_node", node_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/process-modeling/nodes/<node_id>", "delete_node", view_func=lambda node_id: call("delete_node", node_id), methods=["DELETE"])
    bp.add_url_rule("/api/process-modeling/nodes/<node_id>/metadata", "get_node_metadata", view_func=lambda node_id: call("get_node_metadata", node_id), methods=["GET"])
    bp.add_url_rule("/api/process-modeling/nodes/<node_id>/metadata", "update_node_metadata", view_func=lambda node_id: call("update_node_metadata", node_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/process-modeling/operations/<operation_id>", "get_operation", view_func=lambda operation_id: call("get_operation", operation_id), methods=["GET"])
    bp.add_url_rule("/api/process-modeling/operations/<operation_id>", "delete_operation", view_func=lambda operation_id: call("delete_operation", operation_id), methods=["DELETE"])
    bp.add_url_rule("/api/process-modeling/operations/<operation_id>/stages", "update_operation_stages", view_func=lambda operation_id: call("update_operation_stages", operation_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/process-modeling/versions/<version_id>/context", "get_context", view_func=lambda version_id: call("get_context", version_id, request.args.get("node_id"), request.args.get("family"), request.args.get("record_type")), methods=["GET"])
    bp.add_url_rule("/api/process-modeling/nodes/<node_id>/context-records", "create_context_record", view_func=lambda node_id: created(call("create_context_record", node_id, payload())), methods=["POST"])
    bp.add_url_rule("/api/process-modeling/kpis", "calculate_kpi", view_func=lambda: call("calculate_context_kpi", payload()), methods=["POST"])
    bp.add_url_rule("/api/process-modeling/versions/<version_id>/transitions", "create_transition", view_func=lambda version_id: created(call("create_transition", version_id, payload())), methods=["POST"])
    bp.add_url_rule("/api/process-modeling/transitions/<transition_id>", "delete_transition", view_func=lambda transition_id: call("delete_transition", transition_id), methods=["DELETE"])
    bp.add_url_rule("/api/process-modeling/versions/<version_id>/validate", "validate_version", view_func=lambda version_id: call("validate_version", version_id), methods=["POST"])
    return bp
