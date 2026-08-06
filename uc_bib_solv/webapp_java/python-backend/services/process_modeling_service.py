from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from app.domain.process_modeling.entities import ProcessDefinition, ProcessNode, ProcessTransition, ProcessVersion
from app.domain.process_modeling.exceptions import NotDraftError, NotFoundError, ProcessModelingError
from app.domain.process_modeling.validators import validate_graph, validate_hierarchy
from app.domain.process_modeling.context import ContextDetail, ContextRecord, calculate_kpi
from app.persistence.pm_process_repo import NodeRepository, ProcessRepository, TransitionRepository, VersionRepository
from app.domain.machine_modeling.validators import canonical_stages


processes = ProcessRepository()
versions = VersionRepository()
nodes = NodeRepository()
transitions = TransitionRepository()


def _jsonable(value):
    if isinstance(value, (UUID, datetime, date)):
        return str(value)
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    return value


def _version(version_id):
    try:
        value = versions.get(version_id)
    except (ValueError, TypeError):
        raise ProcessModelingError("version_id debe ser un UUID válido", "invalid_uuid")
    if not value:
        raise NotFoundError("Versión no encontrada")
    return value


def _draft(version_id):
    value = _version(version_id)
    if value["status"] != "draft":
        raise NotDraftError()
    return value


def list_processes():
    return _jsonable(processes.list())


def get_process(process_id):
    try:
        value = processes.get(process_id)
    except (ValueError, TypeError):
        raise ProcessModelingError("process_id debe ser un UUID válido", "invalid_uuid")
    if not value:
        raise NotFoundError("Proceso no encontrado")
    return _jsonable(value)


def list_versions(process_id):
    process = get_process(process_id)
    return _jsonable(process.get("versions", []))


def create_process(data):
    entity = ProcessDefinition(**{key: value for key, value in data.items() if key in ProcessDefinition.__dataclass_fields__ and key != "process_id"})
    if entity.parent_process_id:
        parent = processes.get(entity.parent_process_id)
        if not parent:
            raise NotFoundError("Proceso padre no encontrado")
        if str(parent.get("process_id")) == str(entity.process_id) or _hierarchy_contains(entity.parent_process_id, entity.process_id):
            raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
    return _jsonable(processes.create(entity.to_dict()))


def create_version(process_id, data):
    get_process(process_id)
    entity = ProcessVersion(process_id=process_id, **{key: value for key, value in data.items() if key in {"version_id", "version_number", "change_description"}})
    return _jsonable(versions.create(process_id, entity.to_dict()))


def _hierarchy_contains(start_process_id, target_process_id):
    current_id = str(start_process_id)
    target_id = str(target_process_id)
    visited = set()
    while current_id:
        if current_id == target_id:
            return True
        if current_id in visited:
            raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
        visited.add(current_id)
        current = processes.get(current_id)
        current_id = str(current.get("parent_process_id")) if current and current.get("parent_process_id") else ""
    return False


def _outputs(nodes):
    return [
        {"node_id": str(node["node_id"]), "node_code": node["node_code"], "name": node["name"], "output_role": node.get("output_role") or "normal"}
        for node in nodes if node.get("node_type") == "output"
    ]


def _expand_subprocess(parent_payload, expand_node_id):
    parent_node = next((node for node in parent_payload.get("nodes", []) if str(node.get("node_id")) == str(expand_node_id)), None)
    if not parent_node:
        raise NotFoundError("Nodo de expansión no encontrado")
    if parent_node.get("node_type") != "subprocess" or not parent_node.get("child_process_id"):
        raise ProcessModelingError("El nodo no es un subprocess expandible", "not_expandable")
    child_process = processes.get(parent_node["child_process_id"])
    if not child_process:
        raise NotFoundError("Proceso hijo no encontrado")
    versions_list = child_process.get("versions", [])
    child_version = next((item for item in versions_list if item.get("status") == "draft"), None) or (versions_list[-1] if versions_list else None)
    if not child_version:
        raise NotFoundError("El proceso hijo no tiene versiones")
    child_payload = get_version(child_version["version_id"])
    parent_transitions = [item for item in parent_payload.get("transitions", []) if str(item.get("source_node_id")) == str(parent_node["node_id"])]
    child_outputs = child_payload.get("outputs", [])
    child_payload["subprocess_context"] = {
        "parent_version_id": parent_payload["version"]["version_id"],
        "parent_node_id": parent_node["node_id"],
        "child_version_id": child_payload["version"]["version_id"],
        "normal_output_node_ids": [item["node_id"] for item in child_outputs if item.get("output_role") == "normal"],
        "waste_output_node_ids": [item["node_id"] for item in child_outputs if item.get("output_role") == "waste"],
        "parent_continuation_transition_ids": [item["transition_id"] for item in parent_transitions],
        "breadcrumb_label": f"{parent_payload['process'].get('name') or parent_payload['process'].get('process_name')} > {parent_node['name']}",
        "parent_process": parent_payload["process"],
        "parent_version": parent_payload["version"],
    }
    child_payload["breadcrumbs"] = parent_payload.get("breadcrumbs", []) + [{
        "process_id": parent_payload["process"]["process_id"],
        "process_code": parent_payload["process"]["process_code"],
        "name": parent_node["name"],
        "node_id": parent_node["node_id"],
        "version_number": parent_payload["version"]["version_number"],
    }] + child_payload.get("breadcrumbs", [])[-1:]
    return child_payload


def get_version(version_id, expand_node_id=None):
    value = _version(version_id)
    version_process_id = value["process_id"]
    process = processes.get(value["process_id"])
    breadcrumbs = []
    current = process
    visited = set()
    while current:
        process_key = str(current["process_id"])
        if process_key in visited:
            raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
        visited.add(process_key)
        current_version = next((item for item in current.get("versions", []) if str(item["version_id"]) == str(value["version_id"])), None)
        breadcrumbs.append({"process_id": process_key, "process_code": current["process_code"], "name": current["name"], "version_number": current_version["version_number"] if current_version else value["version_number"]})
        parent_id = current.get("parent_process_id")
        current = processes.get(parent_id) if parent_id else None
    value["process"] = {key: value.pop(key) for key in ("process_id", "process_code", "process_name", "process_description", "abstraction_level", "parent_process_id", "process_status") if key in value}
    value["version"] = {key: value.pop(key) for key in ("version_id", "version_number", "change_description", "status", "created_at", "updated_at") if key in value}
    value["version"]["process_id"] = version_process_id
    value["breadcrumbs"] = list(reversed(breadcrumbs))
    value["outputs"] = _outputs(value.get("nodes", []))
    value["subprocess_context"] = None
    value["validation"] = validate_version_payload(value)
    result = _jsonable(value)
    return _expand_subprocess(result, expand_node_id) if expand_node_id else result


def validate_version_payload(payload):
    node_values = payload.get("nodes", [])
    transition_values = payload.get("transitions", [])
    errors = validate_graph(node_values, transition_values)
    process_id = str(payload.get("version", {}).get("process_id"))
    node_ids = {str(node.get("node_id")) for node in node_values}
    for transition in transition_values:
        source = nodes.get(transition.get("source_node_id"))
        target = nodes.get(transition.get("target_node_id"))
        if source and target and (str(source.get("version_id")) != str(payload.get("version", {}).get("version_id")) or str(target.get("version_id")) != str(payload.get("version", {}).get("version_id"))):
            errors["errors"].append({"code": "cross_version_reference", "field": "transition", "message": "La transición debe pertenecer a la misma versión"})
    for node in node_values:
        if node.get("node_type") == "subprocess" and not node.get("child_process_id"):
            errors["errors"].append({"code": "subprocess_child_required", "field": "child_process_id", "message": "Un subprocess requiere proceso hijo"})
        if node.get("child_process_id") == process_id:
            errors["errors"].append({"code": "hierarchy_cycle", "field": "child_process_id", "message": "Un proceso no puede contenerse a sí mismo"})
    return {"valid": not errors["errors"], "errors": errors["errors"]}


def create_node(version_id, data):
    _draft(version_id)
    node_data = {key: value for key, value in data.items() if key in {"node_id", "node_code", "node_type", "name", "description", "child_process_id", "output_role", "properties"}}
    if "etapas" in data:
        node_data.setdefault("properties", {})["etapas"] = canonical_stages(data["etapas"], envelope=True)
    if "stock" in data:
        node_data.setdefault("properties", {})["stock"] = data["stock"]
    entity = ProcessNode(version_id=version_id, **node_data)
    if entity.child_process_id and not processes.get(entity.child_process_id):
        raise NotFoundError("Proceso hijo no encontrado")
    # A child process may already declare the current process as its parent;
    # that is the normal composition direction and must not be rejected as a
    # cycle. A cycle exists when the selected child is an ancestor of the
    # process that owns this version (or when both ids are equal).
    if entity.child_process_id and _hierarchy_contains(_version(version_id)["process_id"], entity.child_process_id):
        raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
    existing = _version(version_id).get("nodes", [])
    if any(item.get("node_code") == entity.node_code for item in existing):
        raise ProcessModelingError("El código de nodo ya existe en la versión", "duplicate_node_code")
    return _jsonable(nodes.create(version_id, entity.to_dict()))


def create_transition(version_id, data):
    version = _draft(version_id)
    entity = ProcessTransition(version_id=version_id, **{key: value for key, value in data.items() if key in {"transition_id", "source_node_id", "target_node_id", "transition_type", "label", "condition", "properties"}})
    source = nodes.get(entity.source_node_id)
    target = nodes.get(entity.target_node_id)
    if not source or not target or str(source["version_id"]) != str(version["version_id"]) or str(target["version_id"]) != str(version["version_id"]):
        raise ProcessModelingError("La transición debe referenciar nodos de la misma versión", "node_reference_missing")
    existing = _version(version_id).get("transitions", [])
    if any(item.get("source_node_id") == entity.source_node_id and item.get("target_node_id") == entity.target_node_id and item.get("transition_type") == entity.transition_type for item in existing):
        raise ProcessModelingError("La transición ya existe", "duplicate_transition")
    return _jsonable(transitions.create(version_id, entity.to_dict()))


def update_version(version_id, data):
    _draft(version_id)
    result = versions.update(version_id, data)
    return _jsonable(result)


def update_node(node_id, data):
    node = nodes.get(node_id)
    if not node:
        raise NotFoundError("Nodo no encontrado")
    _draft(node["version_id"])
    merged = dict(node)
    merged.update(data)
    if "etapas" in data:
        merged["properties"] = dict(node.get("properties") or {})
        merged["properties"]["etapas"] = canonical_stages(data["etapas"], envelope=True)
    entity = ProcessNode(**{key: merged[key] for key in ("node_id", "version_id", "node_code", "node_type", "name", "description", "child_process_id", "output_role", "properties")})
    if entity.child_process_id and not processes.get(entity.child_process_id):
        raise NotFoundError("Proceso hijo no encontrado")
    version_nodes = _version(node["version_id"]).get("nodes", [])
    if any(item.get("node_id") != node_id and item.get("node_code") == entity.node_code for item in version_nodes):
        raise ProcessModelingError("El código de nodo ya existe en la versión", "duplicate_node_code")
    return _jsonable(nodes.update(node_id, entity.to_dict()))


def get_operation(operation_id):
    node = nodes.get(operation_id)
    if not node:
        raise NotFoundError("Operación no encontrada")
    if node.get("node_type") != "operation":
        raise ProcessModelingError("El nodo no es una operación BPM", "invalid_operation_type")
    return _jsonable({
        "operation_id": str(node["node_id"]),
        "process_version_id": str(node["version_id"]),
        "etapas": canonical_stages((node.get("properties") or {}).get("etapas"), envelope=False),
        "schema_version": 1,
        "name": node.get("name"),
        "node_code": node.get("node_code"),
        "properties": node.get("properties") or {},
    })


def update_operation_stages(operation_id, data):
    node = nodes.get(operation_id)
    if not node:
        raise NotFoundError("Operación no encontrada")
    if node.get("node_type") != "operation":
        raise ProcessModelingError("El nodo no es una operación BPM", "invalid_operation_type")
    if "process_version_id" in data and str(data["process_version_id"]) != str(node["version_id"]):
        raise ProcessModelingError("La operación no pertenece a process_version_id", "operation_version_mismatch")
    if "etapas" not in data:
        raise ProcessModelingError("etapas es obligatorio para actualizar la operación", "stages_required")
    result = nodes.update_stages(operation_id, data["etapas"])
    if not result:
        raise NotDraftError()
    return get_operation(operation_id)


def delete_node(node_id):
    node = nodes.get(node_id)
    if not node:
        raise NotFoundError("Nodo no encontrado")
    _draft(node["version_id"])
    if not nodes.delete(node_id):
        raise NotDraftError()
    return {"deleted": True, "node_id": str(node_id)}


def get_node_metadata(node_id):
    node = nodes.get(node_id)
    if not node:
        raise NotFoundError("Nodo no encontrado")
    return {"node_id": str(node_id), "metadata": nodes.get_metadata(node_id)}


def update_node_metadata(node_id, data):
    node = nodes.get(node_id)
    if not node:
        raise NotFoundError("Nodo no encontrado")
    _draft(node["version_id"])
    metadata = data.get("metadata", data)
    if not isinstance(metadata, dict):
        raise ProcessModelingError("Los metadatos deben ser un objeto JSON", "metadata_object_required")
    if any(key in metadata for key in ("context_type", "family", "schema_version", "data", "source", "provenance")):
        metadata = ContextDetail.from_payload(metadata, str(node_id)).to_dict()
    result = nodes.upsert_metadata(node_id, metadata)
    return _jsonable({"node_id": str(node_id), "metadata": result["metadata"], "updated_at": result["updated_at"]})


def create_context_record(node_id, data):
    node = nodes.get(node_id)
    if not node:
        raise NotFoundError("Nodo no encontrado")
    record = ContextRecord.from_payload(data).to_dict()
    result = nodes.create_context_record(str(node_id), str(node["version_id"]), record)
    return _jsonable(result)


def get_context(version_id, node_id=None, family=None, record_type=None):
    payload = get_version(version_id)
    records = nodes.list_context_records(node_id=node_id, version_id=version_id, record_type=record_type)
    if family:
        records = [item for item in records if (item.get("payload") or {}).get("family") == family or (item.get("payload") or {}).get("data", {}).get("family") == family]
    methodology = []
    for name in ("promt.md", "agents.md"):
        path = __import__("pathlib").Path(__file__).resolve().parents[4] / name
        if path.exists():
            methodology.append({"name": name, "version": "repository", "source": {"path": name}, "content": path.read_text(encoding="utf-8")})
    return _jsonable({
        "process": payload.get("process"), "version": payload.get("version"),
        "nodes": payload.get("nodes", []), "transitions": payload.get("transitions", []),
        "details": [{"node_id": item.get("node_id"), "metadata": item.get("metadata") or {}} for item in payload.get("nodes", []) if not node_id or str(item.get("node_id")) == str(node_id)],
        "records": records, "methodology": methodology,
        "filters": {"version_id": str(version_id), "node_id": node_id, "family": family, "record_type": record_type},
        "provenance": {"source": "UC_BIB_Solve", "representation": "structured_context"},
    })


def calculate_context_kpi(data):
    if not isinstance(data, dict):
        raise ProcessModelingError("El payload KPI debe ser un objeto JSON", "invalid_kpi_payload")
    return calculate_kpi(data.get("values") or [], version=str(data.get("version") or ""), source=data.get("source"))


def delete_transition(transition_id):
    transition = transitions.get(transition_id)
    if not transition:
        raise NotFoundError("Transición no encontrada")
    _draft(transition["version_id"])
    if not transitions.delete(transition_id):
        raise NotDraftError()
    return {"deleted": True, "transition_id": str(transition_id)}


def validate_version(version_id):
    return validate_version_payload(get_version(version_id))
