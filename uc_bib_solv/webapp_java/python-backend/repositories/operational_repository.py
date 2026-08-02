from __future__ import annotations

from copy import deepcopy
from uuid import UUID

from app.persistence import contrato_repo, maquina_repo, proceso_repo
from app.persistence.db import db_cursor


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
        "status_filters": [
            {"value": "all", "label": "All"},
            {"value": "active", "label": "Active"},
            {"value": "hold", "label": "Hold"},
            {"value": "inactive", "label": "Inactive"},
        ],
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
        "status_filters": [
            {"value": "all", "label": "All"},
            {"value": "ready", "label": "Ready"},
            {"value": "warning", "label": "Warning"},
            {"value": "hold", "label": "Hold"},
        ],
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
        if contract_count == 0:
            status = "inactive"
        elif any(bool(contract.get("activo", True)) for contract in scoped_contracts):
            status = "active"
        else:
            status = "hold"
        records.append(
            {
                "id": process_id,
                "name": process.get("nombre") or f"Proceso {process_id}",
                "status": status,
                "owner": "Sin responsable",
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
                "machineCount": len(machine_ids),
                "metrica": contract.get("metrica"),
                "objetivo": contract.get("objetivo"),
                "activo": bool(contract.get("activo", True)),
                "version": int(contract.get("version") or 1),
            }
        )
    return records


def _machine_status(contract_ids: list[int], contracts_by_id: dict[int, dict]) -> str:
    if not contract_ids:
        return "hold"
    scoped_contracts = [contracts_by_id[contract_id] for contract_id in contract_ids if contract_id in contracts_by_id]
    if not scoped_contracts:
        return "hold"
    if any(not bool(item.get("activo", True)) for item in scoped_contracts):
        return "hold"
    if len(scoped_contracts) > 1:
        return "warning"
    return "ready"


def _decorate_machine(machine: dict, preferred_contract_id: int | None = None) -> dict:
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
    return {
        "id": int(machine["id"]),
        "contractId": int(contract["id"]) if contract else None,
        "processId": int(process["id"]) if process else None,
        "name": machine.get("nombre") or f"Maquina {machine['id']}",
        "status": _machine_status(links, contracts_by_id),
        "area": contract.get("metrica") or process.get("name") if contract and process else (contract.get("metrica") if contract else "Unassigned"),
        "processName": process.get("name") if process else "Unscoped",
        "contractName": contract.get("name") if contract else "Unscoped",
        "contractIds": links,
    }


def _machine_records() -> list[dict]:
    machines = [dict(item) for item in maquina_repo.get_all()]
    return [_decorate_machine(machine) for machine in machines]


def _filter_processes(status: str | None = None) -> list[dict]:
    records = _process_records()
    if not status or status == "all":
        return records
    return [item for item in records if item["status"] == status]


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
    status: str | None = None,
) -> list[dict]:
    machines = [dict(item) for item in maquina_repo.get_all()]
    records = [_decorate_machine(machine, preferred_contract_id=int(contract_id) if contract_id else None) for machine in machines]
    if process_id:
        records = [item for item in records if item["processId"] == int(process_id)]
    if contract_id:
        records = [item for item in records if item["contractId"] == int(contract_id)]
    if status and status != "all":
        records = [item for item in records if item["status"] == status]
    return records


def _build_catalog() -> dict:
    processes = _process_records()
    contracts = _contract_records()
    machines = _machine_records()
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
        },
    }


def _decorate_page_payload(page: str, payload: dict, params: dict[str, str] | None = None) -> dict:
    params = params or {}
    pages = payload["pages"]
    if page not in pages:
        raise ValueError(f"Unsupported operational page: {page}")

    process_id = params.get("process_id") or params.get("processId") or None
    contract_id = params.get("contract_id") or params.get("contractId") or None
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
            "rows": _filter_processes(status),
            "selected_process_id": process_id_int,
            "status": status,
            "filters": pages[page]["status_filters"],
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
            "rows": _filter_machines(process_id_int, contract_id_int, status),
            "selected_process_id": process_id_int,
            "selected_contract_id": contract_id_int,
            "selected_machine_id": machine_id_int,
            "status": status,
            "filters": pages[page]["status_filters"],
        }
        return result

    raise ValueError(f"Unsupported operational page: {page}")


def list_processes(status: str | None = None) -> list[dict]:
    return _filter_processes(status)


def list_contracts(process_id: str | None = None, status: str | None = None) -> list[dict]:
    process_id_int = _coerce_optional_int(process_id)
    return _filter_contracts(process_id_int, status)


def list_machines(
    process_id: str | None = None,
    contract_id: str | None = None,
    status: str | None = None,
) -> list[dict]:
    process_id_int = _coerce_optional_int(process_id)
    contract_id_int = _coerce_optional_int(contract_id)
    return _filter_machines(process_id_int, contract_id_int, status)


def create_process(payload: dict) -> dict:
    name = str(payload.get("name") or "").strip()
    return {
        **proceso_repo.create(name),
        "status": "inactive",
        "owner": "Sin responsable",
        "contractCount": 0,
        "machineCount": 0,
    }


def update_process(process_id: str, payload: dict) -> dict:
    name = str(payload.get("name") or "").strip()
    proceso_repo.update(int(process_id), name)
    return next(item for item in _process_records() if int(item["id"]) == int(process_id))


def delete_process(process_id: str) -> dict:
    proceso_repo.delete(int(process_id))
    return {
        "deleted": int(process_id),
        "catalog": _build_catalog(),
    }


def create_contract(payload: dict) -> dict:
    process_id = int(payload.get("processId") or payload.get("process_id") or 0)
    name = str(payload.get("name") or "").strip()
    metrica = payload.get("metrica")
    objetivo = payload.get("objetivo")
    created = contrato_repo.create(process_id, name, metrica, objetivo)
    return next(item for item in _contract_records() if int(item["id"]) == int(created["id"]))


def update_contract(contract_id: str, payload: dict) -> dict:
    contract_id_int = int(contract_id)
    current = contrato_repo.get_by_id(contract_id_int)
    if not current:
        raise ValueError("Contrato no encontrado.")

    target_process_id = int(payload.get("processId") or payload.get("process_id") or current["proceso_id"])
    target_name = str(payload.get("name") or current["nombre"] or "").strip()
    target_metrica = payload.get("metrica", current.get("metrica"))
    target_objetivo = payload.get("objetivo", current.get("objetivo"))

    contrato_repo.update(contract_id_int, target_name, target_metrica, target_objetivo)
    if target_process_id != int(current["proceso_id"]):
        with db_cursor() as cur:
            cur.execute(
                """
                UPDATE contrato
                SET proceso_id=%s
                WHERE id=%s
                """,
                (target_process_id, contract_id_int),
            )
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
    created = maquina_repo.create(name)
    if contract_id not in (None, ""):
        contract = contrato_repo.get_by_id(int(contract_id))
        if not contract:
            raise ValueError("Valid contractId is required")
        if process_id not in (None, "") and int(process_id) != int(contract["proceso_id"]):
            raise ValueError("processId must match contract scope")
        contrato_repo.add_maquina(int(contract_id), int(created["id"]))
    return _decorate_machine(created, preferred_contract_id=int(contract_id) if contract_id not in (None, "") else None)


def update_machine(machine_id: str, payload: dict) -> dict:
    machine_id_int = int(machine_id)
    current = maquina_repo.get_by_id(machine_id_int)
    if not current:
        raise ValueError("Máquina no encontrada.")

    target_name = str(payload.get("name") or current["nombre"] or "").strip()
    maquina_repo.update(machine_id_int, target_name)

    if "contractId" in payload or "contract_id" in payload:
        contract_id = payload.get("contractId") or payload.get("contract_id")
        with db_cursor() as cur:
            cur.execute("DELETE FROM contrato_maquina WHERE maquina_id=%s", (machine_id_int,))
        if contract_id not in (None, ""):
            contract = contrato_repo.get_by_id(int(contract_id))
            if not contract:
                raise ValueError("Valid contractId is required")
            process_id = payload.get("processId") or payload.get("process_id")
            if process_id not in (None, "") and int(process_id) != int(contract["proceso_id"]):
                raise ValueError("processId must match contract scope")
            contrato_repo.add_maquina(int(contract_id), machine_id_int)
    return _decorate_machine(maquina_repo.get_by_id(machine_id_int))


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
                 JOIN pm_process_definition p ON p.process_id = v.process_id
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
