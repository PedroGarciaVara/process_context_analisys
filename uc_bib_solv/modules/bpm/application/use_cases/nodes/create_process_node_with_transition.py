from uc_bib_solv.modules.bpm.application.dto.commands import NodeCommand, TransitionCommand
from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages
from uc_bib_solv.modules.bpm.domain.processes.entities import Process, ProcessNode, ProcessTransition
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from uc_bib_solv.modules.bpm.domain.processes.rules import next_node_code


class CreateProcessNodeWithTransition:
    """Create a palette node and its incoming relation in one repository transaction."""

    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id, data):
        process = self.dependencies.process(process_id)
        raw_node = data.get("node") or {}
        node_payload = NodeCommand.from_payload(raw_node).to_dict()
        node_payload["node_code"] = next_node_code(process.get("nodes", []), node_payload.get("node_type"))
        if "etapas" in raw_node:
            node_payload.setdefault("properties", {})["etapas"] = canonical_stages(raw_node["etapas"], envelope=True)
        if "stock" in raw_node:
            node_payload.setdefault("properties", {})["stock"] = raw_node["stock"]
        node = ProcessNode(process_id=process_id, **node_payload)
        if node.child_process_id and not self.dependencies.processes.get(node.child_process_id):
            raise NotFoundError("Proceso hijo no encontrado")
        if node.child_process_id and self.dependencies.hierarchy_contains(process["process_id"], node.child_process_id):
            raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")

        raw_transition = data.get("transition") or {}
        source_id = raw_transition.get("source_node_id")
        transition_payload = TransitionCommand.from_payload({**raw_transition, "target_node_id": node.node_id}).to_dict()
        transition = ProcessTransition(process_id=process_id, **transition_payload)
        source = self.dependencies.nodes.get(source_id)
        if not source or str(source["process_id"]) != str(process_id):
            raise ProcessModelingError("La transición debe referenciar nodos del mismo proceso", "node_reference_missing")
        process_entity = Process(**{key: process[key] for key in ("process_id", "process_code", "name", "description", "parent_process_id", "abstraction_level", "status")})
        process_entity.assert_graph_consistent([*process.get("nodes", []), node], [*process.get("transitions", []), transition])
        return jsonable(self.dependencies.nodes.create_with_transition(process_id, node.to_dict(), transition.to_dict()))
