"""Canonical HTTP adapter for BPM process-modeling and operational contracts."""

from __future__ import annotations

from flask import Blueprint, request

from uc_bib_solv.modules.bpm.domain.shared.exceptions import BpmDomainError
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from uc_bib_solv.utils.http import error, ok


def _contract_detail(operational, contract_id):
    try:
        contract = operational.get_contract(contract_id)
        return ok({"status": "ok", "data": contract}) if contract else error("Contrato no encontrado.", 404, code="not_found")
    except Exception:
        return error("No se pudo consultar el contrato", 409, code="persistence_error")


def create_blueprint(operational, process_modeling):
    bp = Blueprint("bpm_http", __name__)

    def payload():
        return request.get_json(silent=True) or {}

    def process_call(name, *args):
        try:
            return ok({"status": "ok", "data": getattr(process_modeling, name)(*args)})
        except NotFoundError as exc:
            return error(str(exc), 404, code=exc.code)
        except (ProcessModelingError, BpmDomainError) as exc:
            return error(str(exc), 400, code=getattr(exc, "code", "invalid_input"))
        except ValueError as exc:
            return error(str(exc), 400, code="invalid_input")
        except Exception:
            return error("No se pudo completar la operación", 409, code="persistence_error")

    def created(response):
        response.status_code = 201 if response.status_code == 200 else response.status_code
        return response

    # Process-modeling API: this is the canonical BPM entry point.
    bp.add_url_rule("/api/bpm/processes", "processes_list", lambda: process_call("list_processes"), methods=["GET"])
    bp.add_url_rule("/api/bpm/processes", "processes_create", lambda: created(process_call("create_process", payload())), methods=["POST"])
    bp.add_url_rule("/api/bpm/processes/<process_id>", "process_get", lambda process_id: process_call("get_process", process_id, request.args.get("expand_node_id")), methods=["GET"])
    bp.add_url_rule("/api/bpm/processes/<process_id>", "process_update", lambda process_id: process_call("update_process", process_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/bpm/processes/<process_id>", "process_delete", lambda process_id: process_call("delete_process", process_id, request.args.get("cascade", "false").lower() == "true"), methods=["DELETE"])
    bp.add_url_rule("/api/bpm/processes/<process_id>/nodes", "node_create", lambda process_id: created(process_call("create_node", process_id, payload())), methods=["POST"])
    bp.add_url_rule("/api/bpm/processes/<process_id>/nodes-with-transition", "node_with_transition_create", lambda process_id: created(process_call("create_node_with_transition", process_id, payload())), methods=["POST"])
    bp.add_url_rule("/api/bpm/nodes/<node_id>", "node_update", lambda node_id: process_call("update_node", node_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/bpm/nodes/<node_id>", "node_delete", lambda node_id: process_call("delete_node", node_id), methods=["DELETE"])
    bp.add_url_rule("/api/bpm/nodes/<node_id>/metadata", "node_metadata_get", lambda node_id: process_call("get_node_metadata", node_id), methods=["GET"])
    bp.add_url_rule("/api/bpm/nodes/<node_id>/metadata", "node_metadata_update", lambda node_id: process_call("update_node_metadata", node_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/bpm/operations", "operations_list", lambda: operational_call(operational.list_operations, request.args.get("process_id")), methods=["GET"])
    bp.add_url_rule("/api/bpm/operations/<operation_id>/stages", "operation_stages", lambda operation_id: process_call("update_operation_stages", operation_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/bpm/processes/<process_id>/context", "process_context", lambda process_id: process_call("get_context", process_id, request.args.get("node_id"), request.args.get("family"), request.args.get("record_type")), methods=["GET"])
    bp.add_url_rule("/api/bpm/nodes/<node_id>/context-records", "context_record_create", lambda node_id: created(process_call("create_context_record", node_id, payload())), methods=["POST"])
    bp.add_url_rule("/api/bpm/kpis", "kpi_calculate", lambda: process_call("calculate_context_kpi", payload()), methods=["POST"])
    bp.add_url_rule("/api/bpm/processes/<process_id>/transitions", "transition_create", lambda process_id: created(process_call("create_transition", process_id, payload())), methods=["POST"])
    bp.add_url_rule("/api/bpm/transitions/<transition_id>", "transition_delete", lambda transition_id: process_call("delete_transition", transition_id), methods=["DELETE"])
    bp.add_url_rule("/api/bpm/processes/<process_id>/validate", "process_validate", lambda process_id: process_call("validate_process", process_id), methods=["POST"])

    def operational_call(callback, *args):
        try:
            return ok({"status": "ok", "data": callback(*args)})
        except (ValueError, BpmDomainError) as exc:
            return error(str(exc), 400, code=getattr(exc, "code", "invalid_input"), field=getattr(exc, "field", None))
        except Exception:
            return error("No se pudo completar la operación", 409, code="persistence_error")

    # Operational BPM API.  It is namespaced to avoid colliding with the
    # process-modeling aggregate at /api/bpm/processes.
    bp.add_url_rule("/api/bpm/operational/catalog", "operational_catalog", lambda: operational_call(operational.get_operational_catalog, request.args.get("process_id")), methods=["GET"])
    bp.add_url_rule("/api/bpm/operational/page/<page>", "operational_page", lambda page: operational_call(operational.get_operational_page_payload, page, request.args.to_dict(flat=True)), methods=["GET"])
    bp.add_url_rule("/api/bpm/operational/processes", "operational_processes", lambda: operational_call(operational.list_processes), methods=["GET"])
    bp.add_url_rule("/api/bpm/contracts", "contracts_list", lambda: operational_call(operational.list_contracts, request.args.get("process_id") or request.args.get("processId"), request.args.get("status")), methods=["GET"])
    bp.add_url_rule("/api/bpm/contracts", "contracts_create", lambda: created(operational_call(operational.create_contract, payload())), methods=["POST"])
    bp.add_url_rule("/api/bpm/contracts/<contract_id>", "contract_get", lambda contract_id: _contract_detail(operational, contract_id), methods=["GET"])
    bp.add_url_rule("/api/bpm/contracts/<contract_id>", "contract_update", lambda contract_id: operational_call(operational.update_contract, contract_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/bpm/contracts/<contract_id>", "contract_delete", lambda contract_id: operational_call(operational.delete_contract, contract_id), methods=["DELETE"])
    bp.add_url_rule("/api/bpm/contracts/<contract_id>/toggle", "contract_toggle", lambda contract_id: operational_call(operational.toggle_contract, contract_id), methods=["POST"])
    bp.add_url_rule("/api/bpm/contracts/<contract_id>/machines", "contract_machines", lambda contract_id: operational_call(operational.get_contract_machines, contract_id), methods=["GET"])
    bp.add_url_rule("/api/bpm/contracts/<contract_id>/machines", "contract_machines_save", lambda contract_id: operational_call(operational.save_contract_machines, contract_id, payload()), methods=["PUT"])
    bp.add_url_rule("/api/bpm/machines", "machines_list", lambda: operational_call(operational.list_machines, request.args.get("processId") or request.args.get("process_id"), request.args.get("contract_id") or request.args.get("contractId"), request.args.get("operation_id") or request.args.get("operationId"), request.args.get("bpm_process_id")), methods=["GET"])
    bp.add_url_rule("/api/bpm/machines", "machines_create", lambda: created(operational_call(operational.create_machine, payload())), methods=["POST"])
    bp.add_url_rule("/api/bpm/machines/<machine_id>", "machine_update", lambda machine_id: operational_call(operational.update_machine, machine_id, payload()), methods=["PATCH"])
    bp.add_url_rule("/api/bpm/machines/<machine_id>", "machine_delete", lambda machine_id: operational_call(operational.delete_machine, machine_id), methods=["DELETE"])
    bp.add_url_rule("/api/bpm/machines/<machine_id>/context", "machine_context", lambda machine_id: operational_call(operational.get_machine_context, machine_id, request.args.get("operation_id") or request.args.get("operationId"), request.args.get("process_id")), methods=["GET"])
    bp.add_url_rule("/api/bpm/machines/<machine_id>/configurations", "machine_configurations", lambda machine_id: operational_call(operational.list_configurations, int(machine_id)), methods=["GET"])
    # Intención: crear la configuración contextual máquina-operación; no es
    # equivalente a editar la entidad maquina de forma independiente.
    bp.add_url_rule("/api/bpm/machines/<machine_id>/configurations", "machine_configuration_create", lambda machine_id: created(operational_call(operational.create_configuration, {**payload(), "machine_id": int(machine_id)})), methods=["POST"])

    return bp


__all__ = ["create_blueprint"]
