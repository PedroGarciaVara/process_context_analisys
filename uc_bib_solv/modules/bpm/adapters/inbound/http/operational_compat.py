from flask import Blueprint, request

from uc_bib_solv.modules.bpm.infrastructure.wiring import (
    create_contract,
    create_machine,
    create_process,
    delete_contract,
    delete_machine,
    delete_process,
    get_contract_machines,
    get_operational_catalog,
    get_operational_page_payload,
    list_contracts,
    list_machines,
    list_processes,
    save_contract_machines,
    toggle_contract,
    update_contract,
    update_machine,
    update_process,
)
from uc_bib_solv.utils.http import error, ok
from uc_bib_solv.modules.bpm.domain.exceptions import OperationalModelError
from uc_bib_solv.modules.bpm.process_modeling.infrastructure.wiring import create_process_modeling_handlers


bp = Blueprint("operational", __name__)
process_modeling = create_process_modeling_handlers()


def _json_payload() -> dict:
    return request.get_json(silent=True) or {}


@bp.get("/api/operational/catalog")
def operational_catalog():
    try:
        return ok(get_operational_catalog(request.args.get("version_id")))
    except (ValueError, OperationalModelError) as exc:
        return error(str(exc), status_code=400)


@bp.get("/api/operational/page/<page>")
def operational_page(page: str):
    try:
        payload = get_operational_page_payload(page, request.args.to_dict(flat=True))
    except (ValueError, OperationalModelError) as exc:
        return error(str(exc), status_code=400)
    return ok(payload)


@bp.get("/api/operational/processes")
def operational_processes():
    return ok({"status": "ok", "data": list_processes()})


@bp.post("/api/operational/processes")
def operational_process_create():
    try:
        return ok({"status": "ok", "data": create_process(_json_payload())}, status_code=201)
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.patch("/api/operational/processes/<process_id>")
def operational_process_update(process_id: str):
    try:
        return ok({"status": "ok", "data": update_process(process_id, _json_payload())})
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.delete("/api/operational/processes/<process_id>")
def operational_process_delete(process_id: str):
    try:
        return ok({"status": "ok", "data": delete_process(process_id)})
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.get("/api/operational/contracts")
def operational_contracts():
    return ok(
        {
            "status": "ok",
            "data": list_contracts(
                request.args.get("process_id") or request.args.get("processId"),
                request.args.get("status"),
            ),
        }
    )


@bp.post("/api/operational/contracts")
def operational_contract_create():
    try:
        return ok({"status": "ok", "data": create_contract(_json_payload())}, status_code=201)
    except (ValueError, OperationalModelError) as exc:
        return error(str(exc), status_code=400)


@bp.patch("/api/operational/contracts/<contract_id>")
def operational_contract_update(contract_id: str):
    try:
        return ok({"status": "ok", "data": update_contract(contract_id, _json_payload())})
    except (ValueError, OperationalModelError) as exc:
        return error(str(exc), status_code=400)


@bp.post("/api/operational/contracts/<contract_id>/toggle")
def operational_contract_toggle(contract_id: str):
    try:
        return ok({"status": "ok", "data": toggle_contract(contract_id)})
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.get("/api/operational/contracts/<contract_id>/machines")
def operational_contract_machines(contract_id: str):
    try:
        return ok({"status": "ok", "data": get_contract_machines(contract_id)})
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.put("/api/operational/contracts/<contract_id>/machines")
def operational_contract_machines_save(contract_id: str):
    try:
        return ok({"status": "ok", "data": save_contract_machines(contract_id, _json_payload())})
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.delete("/api/operational/contracts/<contract_id>")
def operational_contract_delete(contract_id: str):
    try:
        return ok({"status": "ok", "data": delete_contract(contract_id)})
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.get("/api/operational/machines")
def operational_machines():
    return ok(
        {
            "status": "ok",
            "data": list_machines(
                request.args.get("processId") or request.args.get("legacy_process_id") or (
                    request.args.get("process_id") if request.args.get("process_id", "").isdigit() else None
                ),
                request.args.get("contract_id") or request.args.get("contractId"),
                request.args.get("operation_id") or request.args.get("operationId"),
                request.args.get("process_version_id") or request.args.get("processVersionId"),
                request.args.get("bpm_process_id") or (
                    request.args.get("process_id") if not request.args.get("process_id", "").isdigit() else None
                ),
            ),
        }
    )


@bp.post("/api/operational/machines")
def operational_machine_create():
    try:
        return ok({"status": "ok", "data": create_machine(_json_payload())}, status_code=201)
    except (OperationalModelError, ValueError) as exc:
        return error(str(exc), status_code=400, code=getattr(exc, "code", "invalid_input"), field=getattr(exc, "field", None))


@bp.patch("/api/operational/machines/<machine_id>")
def operational_machine_update(machine_id: str):
    try:
        return ok({"status": "ok", "data": update_machine(machine_id, _json_payload())})
    except (OperationalModelError, ValueError) as exc:
        return error(str(exc), status_code=400, code=getattr(exc, "code", "invalid_input"), field=getattr(exc, "field", None))
    except Exception:
        return error("No se pudo actualizar la máquina", status_code=409, code="persistence_error")


@bp.delete("/api/operational/machines/<machine_id>")
def operational_machine_delete(machine_id: str):
    try:
        return ok({"status": "ok", "data": delete_machine(machine_id)})
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.get("/api/operational/machines/<machine_id>/context")
def operational_machine_context(machine_id: str):
    try:
        from uc_bib_solv.modules.bpm.infrastructure.wiring import get_machine_context

        return ok({"status": "ok", "data": get_machine_context(
            machine_id,
            request.args.get("operation_id") or request.args.get("operationId"),
            request.args.get("process_version_id") or request.args.get("processVersionId"),
        )})
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.patch("/api/operational/operations/<operation_id>/stages")
def operational_operation_stages_update(operation_id: str):
    try:
        from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError

        return ok({"status": "ok", "data": process_modeling.update_operation_stages(operation_id, _json_payload())})
    except NotFoundError as exc:
        return error(str(exc), status_code=404, code=exc.code)
    except ProcessModelingError as exc:
        return error(str(exc), status_code=400, code=exc.code)
    except ValueError as exc:
        return error(str(exc), status_code=400, code=getattr(exc, "code", "invalid_input"))
    except Exception:
        return error("No se pudo actualizar las etapas", status_code=409, code="persistence_error")


@bp.get("/api/operational/machines/<machine_id>/configurations")
def operational_machine_configurations(machine_id: str):
    try:
        from uc_bib_solv.modules.bpm.infrastructure.wiring import list_configurations

        return ok({"status": "ok", "data": list_configurations(int(machine_id))})
    except ValueError as exc:
        return error(str(exc), status_code=400)


@bp.post("/api/operational/machines/<machine_id>/configurations")
def operational_machine_configuration_create(machine_id: str):
    try:
        from uc_bib_solv.modules.bpm.infrastructure.wiring import create_configuration
        from uc_bib_solv.modules.bpm.domain.validators import validate_configuration_payload

        payload = dict(_json_payload())
        payload["machine_id"] = int(machine_id)
        validated = validate_configuration_payload(payload)
        return ok({"status": "ok", "data": create_configuration(validated)}, status_code=201)
    except ValueError as exc:
        return error(str(exc), status_code=400)
