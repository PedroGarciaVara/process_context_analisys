from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.dto.commands import NodeCommand
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages
from uc_bib_solv.modules.bpm.domain.processes.entities import Process, ProcessNode
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from uc_bib_solv.modules.bpm.domain.processes.rules import next_node_code


class CreateProcessNode:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id, data):
        process = self.dependencies.process(process_id)
        node_data = NodeCommand.from_payload(data).to_dict()
        node_data["node_code"] = next_node_code(process.get("nodes", []), node_data.get("node_type"))
        if "etapas" in data:
            node_data.setdefault("properties", {})["etapas"] = canonical_stages(data["etapas"], envelope=True)
        if "stock" in data:
            node_data.setdefault("properties", {})["stock"] = data["stock"]
        entity = ProcessNode(process_id=process_id, **node_data)
        if entity.child_process_id and not self.dependencies.processes.get(entity.child_process_id):
            raise NotFoundError("Proceso hijo no encontrado")
        if entity.child_process_id and self.dependencies.hierarchy_contains(process["process_id"], entity.child_process_id):
            raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
        existing = process.get("nodes", [])
        process_entity = Process(**{key: process[key] for key in ("process_id", "process_code", "name", "description", "parent_process_id", "abstraction_level", "status")})
        process_entity.assert_graph_consistent([*existing, entity], process.get("transitions", []))
        return jsonable(self.dependencies.nodes.create(process_id, entity.to_dict()))
