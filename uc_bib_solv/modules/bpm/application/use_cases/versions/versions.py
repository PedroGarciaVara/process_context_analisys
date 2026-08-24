from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from uc_bib_solv.modules.bpm.domain.processes.rules import validate_graph, validate_hierarchy
from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies


def _outputs(nodes):
    return [
        {
            "node_id": str(node["node_id"]),
            "node_code": node["node_code"],
            "name": node["name"],
            "output_role": node.get("output_role") or "normal",
        }
        for node in nodes
        if node.get("node_type") == "output"
    ]


class GetVersion:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def _expand_subprocess(self, parent_payload, expand_node_id):
        parent_node = next(
            (node for node in parent_payload.get("nodes", []) if str(node.get("node_id")) == str(expand_node_id)),
            None,
        )
        if not parent_node:
            raise NotFoundError("Nodo de expansión no encontrado")
        if parent_node.get("node_type") != "subprocess" or not parent_node.get("child_process_id"):
            raise ProcessModelingError("El nodo no es un subprocess expandible", "not_expandable")
        child_process = self.dependencies.processes.get(parent_node["child_process_id"])
        if not child_process:
            raise NotFoundError("Proceso hijo no encontrado")
        versions = child_process.get("versions", [])
        child_version = next((item for item in versions if item.get("status") == "draft"), None) or (versions[-1] if versions else None)
        if not child_version:
            raise NotFoundError("El proceso hijo no tiene versiones")
        child_payload = self.execute(child_version["version_id"])
        parent_transitions = [
            item for item in parent_payload.get("transitions", [])
            if str(item.get("source_node_id")) == str(parent_node["node_id"])
        ]
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

    def execute(self, version_id, expand_node_id=None):
        value = self.dependencies.version(version_id)
        version_process_id = value["process_id"]
        process = self.dependencies.processes.get(value["process_id"])
        if not process:
            raise NotFoundError("Proceso no encontrado")
        breadcrumbs = []
        current = process
        visited = set()
        while current:
            process_key = str(current["process_id"])
            if process_key in visited:
                raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
            visited.add(process_key)
            current_version = next((item for item in current.get("versions", []) if str(item["version_id"]) == str(value["version_id"])), None)
            breadcrumbs.append({
                "process_id": process_key,
                "process_code": current["process_code"],
                "name": current["name"],
                "version_number": current_version["version_number"] if current_version else value["version_number"],
            })
            parent_id = current.get("parent_process_id")
            current = self.dependencies.processes.get(parent_id) if parent_id else None
        value["process"] = {key: value.pop(key) for key in ("process_id", "process_code", "process_name", "process_description", "abstraction_level", "parent_process_id", "process_status") if key in value}
        value["version"] = {key: value.pop(key) for key in ("version_id", "version_number", "change_description", "status", "created_at", "updated_at") if key in value}
        value["version"]["process_id"] = version_process_id
        value["breadcrumbs"] = list(reversed(breadcrumbs))
        value["outputs"] = _outputs(value.get("nodes", []))
        value["subprocess_context"] = None
        value["validation"] = validate_version_payload(self.dependencies, value)
        result = jsonable(value)
        return self._expand_subprocess(result, expand_node_id) if expand_node_id else result


def validate_version_payload(dependencies: ProcessModelingDependencies, payload):
    node_values = payload.get("nodes", [])
    transition_values = payload.get("transitions", [])
    errors = validate_graph(node_values, transition_values)
    process_id = str(payload.get("version", {}).get("process_id"))
    for transition in transition_values:
        source = dependencies.nodes.get(transition.get("source_node_id"))
        target = dependencies.nodes.get(transition.get("target_node_id"))
        if source and target and (
            str(source.get("version_id")) != str(payload.get("version", {}).get("version_id"))
            or str(target.get("version_id")) != str(payload.get("version", {}).get("version_id"))
        ):
            errors["errors"].append({"code": "cross_version_reference", "field": "transition", "message": "La transición debe pertenecer a la misma versión"})
    for node in node_values:
        if node.get("node_type") == "subprocess" and not node.get("child_process_id"):
            errors["errors"].append({"code": "subprocess_child_required", "field": "child_process_id", "message": "Un subprocess requiere proceso hijo"})
        if node.get("child_process_id") == process_id:
            errors["errors"].append({"code": "hierarchy_cycle", "field": "child_process_id", "message": "Un proceso no puede contenerse a sí mismo"})
    return {"valid": not errors["errors"], "errors": errors["errors"]}


class UpdateVersion:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, version_id, data):
        self.dependencies.draft(version_id)
        return jsonable(self.dependencies.versions.update(version_id, data))


class ValidateVersion:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies
        self.get_version = GetVersion(dependencies)

    def execute(self, version_id):
        return validate_version_payload(self.dependencies, self.get_version.execute(version_id))
