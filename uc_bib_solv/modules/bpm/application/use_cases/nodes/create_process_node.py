from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages
from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessNode
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError


class CreateProcessNode:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, version_id, data):
        self.dependencies.draft(version_id)
        node_data = {
            key: value for key, value in data.items()
            if key in {"node_id", "node_code", "node_type", "name", "description", "child_process_id", "output_role", "properties"}
        }
        if "etapas" in data:
            node_data.setdefault("properties", {})["etapas"] = canonical_stages(data["etapas"], envelope=True)
        if "stock" in data:
            node_data.setdefault("properties", {})["stock"] = data["stock"]
        entity = ProcessNode(version_id=version_id, **node_data)
        if entity.child_process_id and not self.dependencies.processes.get(entity.child_process_id):
            raise NotFoundError("Proceso hijo no encontrado")
        if entity.child_process_id and self.dependencies.hierarchy_contains(self.dependencies.version(version_id)["process_id"], entity.child_process_id):
            raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
        existing = self.dependencies.version(version_id).get("nodes", [])
        if any(item.get("node_code") == entity.node_code for item in existing):
            raise ProcessModelingError("El código de nodo ya existe en la versión", "duplicate_node_code")
        return jsonable(self.dependencies.nodes.create(version_id, entity.to_dict()))
