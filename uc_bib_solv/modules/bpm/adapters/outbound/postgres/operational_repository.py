from __future__ import annotations

from copy import deepcopy
from uuid import UUID
from psycopg2.extras import Json

from uc_bib_solv.modules.bpm.adapters.outbound.postgres import contrato_repo, maquina_repo, proceso_repo
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor
from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages, validate_stages


PAGE_METADATA = {
    "inicio": {
        "title": "Inicio",
        "eyebrow": "Operational entry",
        "description": "Choose a process, contract, and machine before opening the causal tree.",
        "primary_cta": "Open tree",
        "secondary_cta": "Go to procesos",
    },
    "procesos": {
        "title": "Procesos",
        "eyebrow": "Operational list",
        "description": "Browse the process catalog and pivot into contracts with one click.",
        "primary_action": "Open contracts",
        "secondary_action": "Open tree",
    },
    "contratos": {
        "title": "Contratos",
        "eyebrow": "Contract scope",
        "description": "Work with the selected process and keep the tree entry path visible.",
        "status_filters": [
            {"value": "all", "label": "All"},
            {"value": "open", "label": "Open"},
            {"value": "review", "label": "Review"},
            {"value": "closed", "label": "Closed"},
        ],
        "primary_action": "Open tree",
        "secondary_action": "Focus machine",
    },
    "maquinas": {
        "title": "Maquinas",
        "eyebrow": "Machine scope",
        "description": "Inspect the machine layer and keep the selected contract in view.",
        "primary_action": "Open tree",
        "secondary_action": "Focus contract",
    },
}


def _coerce_optional_int(value) -> int | None:
    if value in (None, "", "null"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _list_contract_machine_links() -> list[dict]:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT contrato_id, maquina_id
            FROM contrato_maquina
            ORDER BY contrato_id, maquina_id
            """
        )
        return [dict(row) for row in cur.fetchall()]


def _links_by_contract() -> dict[int, list[int]]:
    mapping: dict[int, list[int]] = {}
    for row in _list_contract_machine_links():
        mapping.setdefault(int(row["contrato_id"]), []).append(int(row["maquina_id"]))
    return mapping


def _links_by_machine() -> dict[int, list[int]]:
    mapping: dict[int, list[int]] = {}
    for row in _list_contract_machine_links():
        mapping.setdefault(int(row["maquina_id"]), []).append(int(row["contrato_id"]))
    return mapping


def _operations_by_machine() -> dict[int, list[dict]]:
    """Return BPM operation identities linked by the canonical configuration table."""
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT moc.machine_id, moc.operation_id, moc.process_version_id,
                   moc.process_id, moc.contract_id, c.proceso_id AS legacy_process_id,
                   n.node_code, n.name, n.description,
                   n.properties->'etapas' AS stage_payload,
                   v.version_number, p.name AS process_name
              FROM machine_operation_configuration moc
              LEFT JOIN contrato c ON c.id = moc.contract_id
              JOIN pm_process_node n ON n.node_id = moc.operation_id
              JOIN pm_process_version v ON v.version_id = moc.process_version_id
              JOIN bpm_process p ON p.process_id = moc.process_id
             WHERE n.node_type = 'operation'
             ORDER BY moc.machine_id, p.name, v.version_number, n.node_code, moc.operation_id
            """
        )
        grouped: dict[int, list[dict]] = {}
        for row in cur.fetchall():
            item = dict(row)
            item["operation_id"] = str(item["operation_id"])
            item["process_version_id"] = str(item["process_version_id"])
            item["process_id"] = str(item["process_id"])
            item["contract_id"] = int(item["contract_id"]) if item["contract_id"] is not None else None
            item["legacy_process_id"] = int(item["legacy_process_id"]) if item["legacy_process_id"] is not None else None
            stage_payload = item.pop("stage_payload", None)
            if isinstance(stage_payload, dict):
                stage_payload = stage_payload.get("etapas", [])
            item["etapas"] = validate_stages(stage_payload or [])
            item["etapas_schema_version"] = 1
            grouped.setdefault(int(item["machine_id"]), []).append(item)
        return grouped


def _process_records() -> list[dict]:
    processes = [dict(item) for item in proceso_repo.get_all()]
    contracts = [dict(item) for item in contrato_repo.get_all()]
    links_by_contract = _links_by_contract()

    records: list[dict] = []
    for process in processes:
        process_id = int(process["id"])
        scoped_contracts = [item for item in contracts if int(item["proceso_id"]) == process_id]
        contract_count = len(scoped_contracts)
        machine_ids = {
            machine_id
            for contract in scoped_contracts
            for machine_id in links_by_contract.get(int(contract["id"]), [])
        }
        records.append(
            {
                "id": process_id,
                "name": process.get("nombre") or f"Proceso {process_id}",
                "bpmProcessId": str(process["bpm_process_id"]) if process.get("bpm_process_id") else None,
                "contractCount": contract_count,
                "machineCount": len(machine_ids),
            }
        )
    return records


def _contract_status(contract: dict, machine_count: int) -> str:
    if not bool(contract.get("activo", True)):
        return "closed"
    if machine_count == 0:
        return "review"
    return "open"


def _contract_scope_options() -> dict:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT p.process_id, p.name, lp.id AS legacy_process_id
              FROM bpm_process p
              JOIN proceso lp ON lp.bpm_process_id = p.process_id
             ORDER BY p.name, p.process_id
            """
        )
        processes = [
            {"id": str(row["process_id"]), "name": row["name"], "processId": int(row["legacy_process_id"])}
            for row in cur.fetchall()
        ]
        cur.execute(
            """
            SELECT n.node_id, n.name, n.version_id, p.process_id AS bpm_process_id,
                   p.name AS process_name, lp.id AS process_id
              FROM pm_process_node n
              JOIN pm_process_version v ON v.version_id = n.version_id
              JOIN bpm_process p ON p.process_id = v.process_id
              JOIN proceso lp ON lp.bpm_process_id = p.process_id
             WHERE n.node_type = 'operation'
             ORDER BY p.name, n.name, n.node_id
            """
        )
        operations = [
            {
                "id": str(row["node_id"]),
                "name": row["name"],
                "versionId": str(row["version_id"]),
                "bpmProcessId": str(row["bpm_process_id"]),
                "processName": row["process_name"],
                "processId": int(row["process_id"]),
            }
            for row in cur.fetchall()
        ]
    return {"processes": processes, "operations": operations}


def _resolve_contract_scope(payload: dict) -> tuple[int, str]:
    bpm_process_id = payload.get("bpm_process_id")
    bpm_node_id = payload.get("bpm_node_id")
    if bool(bpm_process_id) == bool(bpm_node_id):
        raise ValueError("Selecciona un proceso BPM o una operación BPM, pero no ambos.")
    with db_cursor() as cur:
        if bpm_process_id:
            cur.execute(
                """
                SELECT lp.id, p.name
                  FROM bpm_process p
                  JOIN proceso lp ON lp.bpm_process_id = p.process_id
                 WHERE p.process_id=%s
                """,
                (str(bpm_process_id),),
            )
        else:
            cur.execute(
                """
                SELECT lp.id, n.name
                  FROM pm_process_node n
                  JOIN pm_process_version v ON v.version_id=n.version_id
                  JOIN bpm_process p ON p.process_id=v.process_id
                  JOIN proceso lp ON lp.bpm_process_id=p.process_id
                 WHERE n.node_id=%s AND n.node_type='operation'
                """,
                (str(bpm_node_id),),
            )
        row = cur.fetchone()
    if not row:
        raise ValueError("El alcance BPM seleccionado no existe o no está vinculado a un proceso canónico.")
    return int(row["id"]), str(row["name"])


def _contract_records() -> list[dict]:
    processes = {int(item["id"]): item for item in _process_records()}
    contracts = [dict(item) for item in contrato_repo.get_all()]
    links_by_contract = _links_by_contract()
    records: list[dict] = []
    for contract in contracts:
        contract_id = int(contract["id"])
        process_id = int(contract["proceso_id"])
        machine_ids = links_by_contract.get(contract_id, [])
        status = _contract_status(contract, len(machine_ids))
        records.append(
            {
                "id": contract_id,
                "processId": process_id,
                "name": contract.get("nombre") or f"Contrato {contract_id}",
                "status": status,
                "updated": f"v{int(contract.get('version') or 1)}",
                "processName": processes.get(process_id, {}).get("name", "Unscoped"),
                "bpmProcessId": str(contract["bpm_process_id"]) if contract.get("bpm_process_id") else None,
                "bpmNodeId": str(contract["bpm_node_id"]) if contract.get("bpm_node_id") else None,
                "scopeType": "process" if contract.get("bpm_process_id") else "operation",
                "machineCount": len(machine_ids),
                "metrica": contract.get("metrica"),
                "objetivo": contract.get("objetivo"),
                "activo": bool(contract.get("activo", True)),
                "version": int(contract.get("version") or 1),
            }
        )
    return records


def _decorate_machine(
    machine: dict,
    preferred_contract_id: int | None = None,
    operation_id: str | None = None,
    process_version_id: str | None = None,
) -> dict:
    processes_by_id = {int(item["id"]): item for item in _process_records()}
    contracts_by_id = {int(item["id"]): item for item in _contract_records()}
    links = _links_by_machine().get(int(machine["id"]), [])
    selected_contract_id = None
    if preferred_contract_id and preferred_contract_id in links:
        selected_contract_id = preferred_contract_id
    elif links:
        selected_contract_id = sorted(links)[0]

    contract = contracts_by_id.get(selected_contract_id) if selected_contract_id is not None else None
    process = processes_by_id.get(int(contract["processId"])) if contract else None
    operations = _operations_by_machine().get(int(machine["id"]), [])
    scoped_operation = next(
        (
            item for item in operations
            if (not operation_id or item["operation_id"] == str(operation_id))
            and (not process_version_id or item["process_version_id"] == str(process_version_id))
        ),
        None,
    )
    # A BPM configuration is the authoritative scope when an operation filter
    # is active.  contrato_maquina remains a compatibility relation, but its
    # sorted first row must not replace the configuration's contract identity.
    if scoped_operation and scoped_operation["contract_id"] is not None:
        selected_contract_id = scoped_operation["contract_id"]
        contract = contracts_by_id.get(selected_contract_id)
        process = processes_by_id.get(int(contract["processId"])) if contract else None
    operation_process_name = scoped_operation.get("process_name") if scoped_operation else None
    return {
        "id": int(machine["id"]),
        "machineTypeId": int(machine["maquinas_tipo_id"]) if machine.get("maquinas_tipo_id") is not None else None,
        "contractId": int(contract["id"]) if contract else None,
        "processId": int(process["id"]) if process else None,
        "name": machine.get("nombre") or f"Maquina {machine['id']}",
        "area": (contract.get("metrica") or process.get("name") if contract and process else (contract.get("metrica") if contract else None)) or operation_process_name or "Unassigned",
        "processName": process.get("name") if process else (operation_process_name or "Unscoped"),
        "contractName": contract.get("name") if contract else "Unscoped",
        "contractIds": links,
        "operations": operations,
        "operationIds": [item["operation_id"] for item in operations],
        "processVersionIds": [item["process_version_id"] for item in operations],
        "selectedOperationId": scoped_operation["operation_id"] if scoped_operation else None,
        "selectedProcessVersionId": scoped_operation["process_version_id"] if scoped_operation else None,
        "selectedBpmProcessId": scoped_operation["process_id"] if scoped_operation else None,
        "selectedOperationContractId": scoped_operation["contract_id"] if scoped_operation else None,
        "operationRelations": [
            {
                "operation_id": item["operation_id"],
                "process_version_id": item["process_version_id"],
                "process_id": item["process_id"],
                "contract_id": item["contract_id"],
                "legacy_process_id": item["legacy_process_id"],
                "etapas": validate_stages(item.get("etapas") or []),
                "etapas_schema_version": item.get("etapas_schema_version", 1),
            }
            for item in operations
        ],
    }


def _machine_records() -> list[dict]:
    machines = [dict(item) for item in maquina_repo.get_all()]
    return [_decorate_machine(machine) for machine in machines]


def _save_operation_stages(payload: dict) -> None:
    if "etapas" not in payload:
        return
    operation_id = payload.get("operation_id") or payload.get("operationId")
    version_id = payload.get("process_version_id") or payload.get("processVersionId")
    if not operation_id or not version_id:
        raise ValueError("operation_id y process_version_id son obligatorios para guardar etapas.")
    stages = validate_stages(payload.get("etapas"))
    with db_cursor() as cur:
        cur.execute(
            """UPDATE pm_process_node
                  SET properties = jsonb_set(COALESCE(properties, '{}'::jsonb), '{etapas}', %s::jsonb, true),
                      updated_at = NOW()
                WHERE node_id=%s AND version_id=%s AND node_type='operation'
                RETURNING node_id""",
            (Json(canonical_stages(stages, envelope=True)), str(operation_id), str(version_id)),
        )
        if not cur.fetchone():
            raise ValueError("La operación BPM no existe o no pertenece a la versión indicada.")


def _filter_contracts(process_id: int | None = None, status: str | None = None) -> list[dict]:
    records = _contract_records()
    if process_id:
        records = [item for item in records if int(item["processId"]) == int(process_id)]
    if status and status != "all":
        records = [item for item in records if item["status"] == status]
    return records


def _filter_machines(
    process_id: int | None = None,
    contract_id: int | None = None,
    operation_id: str | None = None,
    process_version_id: str | None = None,
    bpm_process_id: str | None = None,
) -> list[dict]:
    operation_scope = None
    if operation_id:
        with db_cursor() as cur:
            cur.execute(
                """
                SELECT moc.process_id, c.proceso_id AS legacy_process_id
                  FROM machine_operation_configuration moc
                  LEFT JOIN contrato c ON c.id = moc.contract_id
                 WHERE moc.operation_id = %s
                   AND (%s IS NULL OR moc.process_version_id = %s)
                 LIMIT 1
                """,
                (operation_id, process_version_id, process_version_id),
            )
            operation_scope = cur.fetchone()
        if not operation_scope:
            raise ValueError("La operación BPM no existe o no tiene una configuración canónica.")
        if bpm_process_id and str(operation_scope["process_id"]) != str(bpm_process_id):
            raise ValueError("process_id BPM no coincide con la operación seleccionada.")
        if process_id and operation_scope["legacy_process_id"] is not None and int(process_id) != int(operation_scope["legacy_process_id"]):
            raise ValueError("processId legacy no coincide con la operación BPM seleccionada.")
    machines = [dict(item) for item in maquina_repo.get_all()]
    records = [
        _decorate_machine(
            machine,
            preferred_contract_id=int(contract_id) if contract_id else None,
            operation_id=operation_id,
            process_version_id=process_version_id,
        )
        for machine in machines
    ]
    if process_id:
        records = [item for item in records if item["processId"] == int(process_id)]
    if contract_id:
        records = [item for item in records if item["contractId"] == int(contract_id)]
    if operation_id:
        records = [
            item for item in records
            if any(
                operation["operation_id"] == str(operation_id)
                and (not process_version_id or operation["process_version_id"] == str(process_version_id))
                for operation in item["operations"]
            )
        ]
    return records


def _build_catalog() -> dict:
    processes = _process_records()
    contracts = _contract_records()
    machines = _machine_records()
    contract_scopes = _contract_scope_options()
    default_process_id = processes[0]["id"] if processes else None
    default_contract = next((item for item in contracts if item["processId"] == default_process_id), contracts[0] if contracts else None)
    default_contract_id = default_contract["id"] if default_contract else None
    default_machine = next((item for item in machines if item["contractId"] == default_contract_id), machines[0] if machines else None)
    return {
        "status": "ok",
        "app_name": "UC_BIB_Solve",
        "pages": deepcopy(PAGE_METADATA),
        "summary": {
            "procesos": len(processes),
            "contratos": len(contracts),
            "maquinas": len(machines),
        },
        "defaults": {
            "processId": default_process_id,
            "contractId": default_contract_id,
            "machineId": default_machine["id"] if default_machine else None,
        },
        "data": {
            "procesos": processes,
            "contratos": contracts,
            "maquinas": machines,
            "contractScopes": contract_scopes,
        },
    }


def _decorate_page_payload(page: str, payload: dict, params: dict[str, str] | None = None) -> dict:
    params = params or {}
    pages = payload["pages"]
    if page not in pages:
        raise ValueError(f"Unsupported operational page: {page}")

    process_id = params.get("processId") or params.get("legacy_process_id") or None
    raw_process_id = params.get("process_id")
    if process_id is None and raw_process_id and _coerce_optional_int(raw_process_id) is not None:
        process_id = raw_process_id
    bpm_process_id = params.get("bpm_process_id") or (
        raw_process_id if raw_process_id and _coerce_optional_int(raw_process_id) is None else None
    )
    contract_id = params.get("contract_id") or params.get("contractId") or None
    operation_id = params.get("operation_id") or params.get("operationId") or None
    process_version_id = params.get("process_version_id") or params.get("processVersionId") or None
    machine_id = params.get("machine_id") or params.get("machineId") or None
    status = params.get("status") or params.get("filter") or "all"
    process_id_int = _coerce_optional_int(process_id)
    contract_id_int = _coerce_optional_int(contract_id)
    machine_id_int = _coerce_optional_int(machine_id)

    result = {
        "status": "ok",
        "page": page,
        "page_meta": deepcopy(pages[page]),
        "catalog": payload,
    }

    if page == "inicio":
        processes = payload["data"]["procesos"]
        contracts = payload["data"]["contratos"]
        machines = payload["data"]["maquinas"]
        if process_id_int:
            contracts = [item for item in contracts if int(item["processId"]) == process_id_int]
            machines = [item for item in machines if int(item["processId"] or 0) == process_id_int]
        if contract_id_int:
            machines = [item for item in machines if int(item["contractId"] or 0) == contract_id_int]
        result["data"] = {
            "processes": processes,
            "contracts": contracts,
            "machines": machines,
            "selected_process_id": process_id_int,
            "selected_contract_id": contract_id_int,
            "selected_machine_id": machine_id_int,
        }
        return result

    if page == "procesos":
        result["data"] = {
            "rows": _process_records(),
            "selected_process_id": process_id_int,
        }
        return result

    if page == "contratos":
        result["data"] = {
            "rows": _filter_contracts(process_id_int, status),
            "selected_process_id": process_id_int,
            "selected_contract_id": contract_id_int,
            "status": status,
            "filters": pages[page]["status_filters"],
        }
        return result

    if page == "maquinas":
        result["data"] = {
            "rows": _filter_machines(process_id_int, contract_id_int, operation_id, process_version_id, bpm_process_id),
            "selected_process_id": process_id_int,
            "selected_contract_id": contract_id_int,
            "selected_operation_id": operation_id,
            "selected_process_version_id": process_version_id,
            "selected_machine_id": machine_id_int,
        }
        return result

    raise ValueError(f"Unsupported operational page: {page}")


def list_processes() -> list[dict]:
    return _process_records()


def list_contracts(process_id: str | None = None, status: str | None = None) -> list[dict]:
    process_id_int = _coerce_optional_int(process_id)
    return _filter_contracts(process_id_int, status)


def list_machines(
    process_id: str | None = None,
    contract_id: str | None = None,
    operation_id: str | None = None,
    process_version_id: str | None = None,
    bpm_process_id: str | None = None,
) -> list[dict]:
    process_id_int = _coerce_optional_int(process_id)
    contract_id_int = _coerce_optional_int(contract_id)
    return _filter_machines(process_id_int, contract_id_int, operation_id, process_version_id, bpm_process_id)


def get_machine_context(machine_id: int, operation_id: str | None = None, process_version_id: str | None = None) -> dict | None:
    """Expose the canonical machine context through the operational adapter."""
    from uc_bib_solv.modules.bpm.adapters.outbound.postgres.machine_model_repo import get_machine_context as load_machine_context

    return load_machine_context(int(machine_id), operation_id, process_version_id)


def create_process(payload: dict) -> dict:
    raise ValueError("Los procesos deben crearse desde el modelado BPM.")


def update_process(process_id: str, payload: dict) -> dict:
    name = str(payload.get("name") or "").strip()
    proceso_repo.update(int(process_id), name)
    return next(item for item in _process_records() if int(item["id"]) == int(process_id))


def delete_process(process_id: str) -> dict:
    raise ValueError("Los procesos se eliminan desde el modelado BPM.")


def create_contract(payload: dict) -> dict:
    name = str(payload.get("name") or "").strip()
    metrica = payload.get("metrica")
    objetivo = payload.get("objetivo")
    process_id, _ = _resolve_contract_scope(payload)
    created = contrato_repo.create(
        process_id,
        name,
        metrica,
        objetivo,
        payload.get("bpm_process_id"),
        payload.get("bpm_node_id"),
    )
    return next(item for item in _contract_records() if int(item["id"]) == int(created["id"]))


def update_contract(contract_id: str, payload: dict) -> dict:
    contract_id_int = int(contract_id)
    current = contrato_repo.get_by_id(contract_id_int)
    if not current:
        raise ValueError("Contrato no encontrado.")

    target_name = str(payload.get("name") or current["nombre"] or "").strip()
    target_metrica = payload.get("metrica", current.get("metrica"))
    target_objetivo = payload.get("objetivo", current.get("objetivo"))

    contrato_repo.update(contract_id_int, target_name, target_metrica, target_objetivo)
    return next(item for item in _contract_records() if int(item["id"]) == contract_id_int)


def toggle_contract(contract_id: str) -> dict:
    contract_id_int = int(contract_id)
    contrato_repo.toggle_activo(contract_id_int)
    return next(item for item in _contract_records() if int(item["id"]) == contract_id_int)


def delete_contract(contract_id: str) -> dict:
    contrato_repo.delete(int(contract_id))
    return {
        "deleted": int(contract_id),
        "catalog": _build_catalog(),
    }


def get_contract_machines(contract_id: str) -> dict:
    contract_id_int = int(contract_id)
    contract = next((item for item in _contract_records() if int(item["id"]) == contract_id_int), None)
    if not contract:
        raise ValueError("Contrato no encontrado.")
    assigned = contrato_repo.get_maquinas(contract_id_int)
    assigned_ids = [int(item["id"]) for item in assigned]
    available = [
        {"id": int(machine["id"]), "name": machine["name"]}
        for machine in _machine_records()
    ]
    return {
        "contractId": contract_id_int,
        "machineIds": assigned_ids,
        "assigned": [{"id": int(item["id"]), "name": item["nombre"]} for item in assigned],
        "available": available,
    }


def save_contract_machines(contract_id: str, payload: dict) -> dict:
    contract_id_int = int(contract_id)
    contract = contrato_repo.get_by_id(contract_id_int)
    if not contract:
        raise ValueError("Contrato no encontrado.")

    raw_machine_ids = payload.get("machine_ids")
    if raw_machine_ids is None:
        raw_machine_ids = payload.get("machineIds", [])
    selected_ids = {int(machine_id) for machine_id in (raw_machine_ids or [])}
    current_ids = {int(item["id"]) for item in contrato_repo.get_maquinas(contract_id_int)}

    for machine_id in selected_ids - current_ids:
        contrato_repo.add_maquina(contract_id_int, machine_id)
    for machine_id in current_ids - selected_ids:
        contrato_repo.remove_maquina(contract_id_int, machine_id)

    return get_contract_machines(contract_id)


def create_machine(payload: dict) -> dict:
    name = str(payload.get("name") or "").strip()
    contract_id = payload.get("contractId") or payload.get("contract_id")
    process_id = payload.get("processId") or payload.get("process_id")
    machine_type = dict(payload.get("machine_type") or {})
    machine_type_id = payload.get("machine_type_id") or payload.get("machineTypeId")
    _validate_machine_scope(contract_id, process_id)
    if machine_type_id in (None, ""):
        type_name = str(machine_type.get("name") or "").strip()
        if not type_name:
            raise ValueError("El nombre del tipo de máquina es obligatorio.")
        machine_type_id = _save_machine_type(machine_type)
    machine_fields = _machine_write_fields(payload)
    created = maquina_repo.create(name, int(machine_type_id), **machine_fields)
    if contract_id not in (None, ""):
        contract = contrato_repo.get_by_id(int(contract_id))
        if not contract:
            raise ValueError("Valid contractId is required")
        if process_id not in (None, "") and int(process_id) != int(contract["proceso_id"]):
            raise ValueError("processId must match contract scope")
        contrato_repo.add_maquina(int(contract_id), int(created["id"]))
        with db_cursor() as cur:
            cur.execute("UPDATE maquina SET contract_id=%s WHERE id=%s", (int(contract_id), int(created["id"])))
    _save_operation_stages(payload)
    return _decorate_machine(created, preferred_contract_id=int(contract_id) if contract_id not in (None, "") else None)


def update_machine(machine_id: str, payload: dict) -> dict:
    machine_id_int = int(machine_id)
    current = maquina_repo.get_by_id(machine_id_int)
    if not current:
        raise ValueError("Máquina no encontrada.")

    target_name = str(payload.get("name") or current["nombre"] or "").strip()
    machine_type_id = payload.get("machine_type_id") or payload.get("machineTypeId") or current.get("maquinas_tipo_id")
    machine_type = payload.get("machine_type")
    _validate_machine_scope(payload.get("contractId") or payload.get("contract_id"), payload.get("processId") or payload.get("process_id"))
    if machine_type:
        machine_type_id = _save_machine_type(dict(machine_type), machine_type_id)
    if machine_type_id in (None, ""):
        raise ValueError("El tipo de máquina es obligatorio.")
    maquina_repo.update(machine_id_int, target_name, int(machine_type_id), **_machine_write_fields(payload, current))

    if "contractId" in payload or "contract_id" in payload:
        contract_id = payload.get("contractId") or payload.get("contract_id")
        with db_cursor() as cur:
            cur.execute("DELETE FROM contrato_maquina WHERE maquina_id=%s", (machine_id_int,))
            cur.execute("UPDATE maquina SET contract_id=%s WHERE id=%s", (contract_id or None, machine_id_int))
        if contract_id not in (None, ""):
            contract = contrato_repo.get_by_id(int(contract_id))
            if not contract:
                raise ValueError("Valid contractId is required")
            process_id = payload.get("processId") or payload.get("process_id")
            if process_id not in (None, "") and int(process_id) != int(contract["proceso_id"]):
                raise ValueError("processId must match contract scope")
            contrato_repo.add_maquina(int(contract_id), machine_id_int)
    _save_operation_stages(payload)
    return _decorate_machine(
        maquina_repo.get_by_id(machine_id_int),
        preferred_contract_id=int(contract_id) if "contract_id" in locals() and contract_id not in (None, "") else None,
    )


def _json_value(payload: dict, key: str, current: dict | None = None):
    value = payload.get(key, current.get(key) if current else None)
    if value in (None, ""):
        return None
    if isinstance(value, str):
        import json
        try:
            return json.loads(value)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{key} debe ser JSON válido.") from exc
    if not isinstance(value, (dict, list)):
        raise ValueError(f"{key} debe ser un objeto o una lista.")
    return value


def _validate_machine_scope(contract_id, process_id) -> None:
    """Validate cross-aggregate scope before any machine/type write."""
    if contract_id in (None, ""):
        return
    contract = contrato_repo.get_by_id(int(contract_id))
    if not contract:
        raise ValueError("Valid contractId is required")
    if process_id not in (None, "") and int(process_id) != int(contract["proceso_id"]):
        raise ValueError("processId must match contract scope")


def _machine_write_fields(payload: dict, current: dict | None = None) -> dict:
    fields = {"specific_description": payload.get("specific_description", current.get("specific_description") if current else None)}
    for key in ("specific_characteristics", "specific_parameters", "specific_operating_ranges", "specific_limitations", "specific_instructions", "differences_from_machine_type"):
        fields[key] = _json_value(payload, key, current)
    return fields


def _save_machine_type(payload: dict, machine_type_id: int | str | None = None) -> int:
    name = str(payload.get("name") or payload.get("nombre") or "").strip()
    principle = str(payload.get("operating_principle") or "").strip()
    description = str(payload.get("general_technical_description") or payload.get("description") or "").strip()
    if not name or not principle or not description:
        raise ValueError("El tipo requiere nombre, principio de funcionamiento y descripción técnica general.")
    values = {
        "technology_description": payload.get("technology_description"),
        "nominal_capacity": _json_value(payload, "nominal_capacity"),
        "operating_principle": principle,
        "elements_zones_positions": _json_value(payload, "elements_zones_positions") or [],
        "control_systems": _json_value(payload, "control_systems") or [],
        "common_technical_characteristics": _json_value(payload, "common_technical_characteristics") or [],
        "common_limitations": _json_value(payload, "common_limitations") or [],
        "general_technical_description": description,
    }
    with db_cursor() as cur:
        if machine_type_id not in (None, ""):
            cur.execute("SELECT id FROM maquinas_tipo WHERE id=%s", (int(machine_type_id),))
            if not cur.fetchone():
                raise ValueError("Tipo de máquina no encontrado.")
            cur.execute(
                """UPDATE maquinas_tipo SET nombre=%s, technology_description=%s, nominal_capacity=%s,
                   operating_principle=%s, elements_zones_positions=%s, control_systems=%s,
                   common_technical_characteristics=%s, common_limitations=%s,
                   general_technical_description=%s WHERE id=%s RETURNING id""",
                (name, values["technology_description"], Json(values["nominal_capacity"]) if values["nominal_capacity"] is not None else None,
                 values["operating_principle"], Json(values["elements_zones_positions"]), Json(values["control_systems"]),
                 Json(values["common_technical_characteristics"]), Json(values["common_limitations"]), values["general_technical_description"], int(machine_type_id)),
            )
        else:
            cur.execute(
                """INSERT INTO maquinas_tipo
                   (nombre, technology_description, nominal_capacity, operating_principle,
                    elements_zones_positions, control_systems, common_technical_characteristics,
                    common_limitations, general_technical_description)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (name, values["technology_description"], Json(values["nominal_capacity"]) if values["nominal_capacity"] is not None else None,
                 values["operating_principle"], Json(values["elements_zones_positions"]), Json(values["control_systems"]),
                 Json(values["common_technical_characteristics"]), Json(values["common_limitations"]), values["general_technical_description"]),
            )
        return int(cur.fetchone()["id"])


def delete_machine(machine_id: str) -> dict:
    maquina_repo.delete(int(machine_id))
    return {
        "deleted": int(machine_id),
        "catalog": _build_catalog(),
    }


def _bpm_identity(version_id: str | None) -> dict | None:
    """Return the generic BPM-to-operational identity for an exact version."""
    if not version_id:
        return None
    try:
        version_uuid = str(UUID(str(version_id)))
    except (TypeError, ValueError):
        raise ValueError("version_id must be a valid UUID")
    with db_cursor() as cur:
        cur.execute(
            """SELECT v.version_id, v.process_id AS bpm_process_id,
                      v.version_number, p.process_code, p.name, p.description
                 FROM pm_process_version v
                 JOIN bpm_process p ON p.process_id = v.process_id
                WHERE v.version_id = %s""",
            (version_uuid,),
        )
        version = cur.fetchone()
        if not version:
            raise ValueError("BPM version not found")
        cur.execute(
            """SELECT node_id, node_code, node_type, properties
                 FROM pm_process_node
                WHERE version_id = %s AND node_type = 'operation'
                ORDER BY node_code, node_id""",
            (version_uuid,),
        )
        relations = []
        for row in cur.fetchall():
            ids = dict((row["properties"] or {}).get("canonical_ids") or {})
            if ids.get("contrato_id") is None:
                continue
            cur.execute(
                """SELECT c.id AS contract_id, c.proceso_id AS process_id,
                          ARRAY_REMOVE(ARRAY_AGG(cm.maquina_id ORDER BY cm.maquina_id), NULL) AS machine_ids
                     FROM contrato c
                     LEFT JOIN contrato_maquina cm ON cm.contrato_id = c.id
                    WHERE c.id = %s
                    GROUP BY c.id, c.proceso_id""",
                (int(ids["contrato_id"]),),
            )
            canonical = cur.fetchone()
            relations.append({
                "node_id": str(row["node_id"]),
                "node_code": row["node_code"],
                "process_id": ids.get("proceso_id"),
                "contract_id": ids.get("contrato_id"),
                "machine_ids": list((canonical or {}).get("machine_ids") or []),
            })
    return {"version": dict(version), "relations": relations}


def get_operational_catalog(version_id: str | None = None) -> dict:
    payload = _build_catalog()
    if version_id:
        payload["bpm"] = _bpm_identity(version_id)
    return payload


def get_operational_page_payload(page: str, params: dict[str, str] | None = None) -> dict:
    return _decorate_page_payload(page, _build_catalog(), params)
