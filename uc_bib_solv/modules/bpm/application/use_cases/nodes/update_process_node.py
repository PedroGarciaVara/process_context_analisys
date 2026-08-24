from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages
from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessNode
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError


class UpdateProcessNode:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id, data):
        node = self.dependencies.nodes.get(node_id)
        if not node:
            raise NotFoundError("Nodo no encontrado")
        self.dependencies.draft(node["version_id"])
        merged = dict(node)
        merged.update(data)
        if "etapas" in data:
            merged["properties"] = dict(node.get("properties") or {})
            merged["properties"]["etapas"] = canonical_stages(data["etapas"], envelope=True)
        entity = ProcessNode(**{key: merged[key] for key in ("node_id", "version_id", "node_code", "node_type", "name", "description", "child_process_id", "output_role", "properties")})
        if entity.child_process_id and not self.dependencies.processes.get(entity.child_process_id):
            raise NotFoundError("Proceso hijo no encontrado")
        version_nodes = self.dependencies.version(node["version_id"]).get("nodes", [])
        if any(item.get("node_id") != node_id and item.get("node_code") == entity.node_code for item in version_nodes):
            raise ProcessModelingError("El código de nodo ya existe en la versión", "duplicate_node_code")
        return jsonable(self.dependencies.nodes.update(node_id, entity.to_dict()))
