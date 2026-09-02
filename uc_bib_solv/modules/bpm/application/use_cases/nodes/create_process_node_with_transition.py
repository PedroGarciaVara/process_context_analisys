from uc_bib_solv.modules.bpm.application.dto.commands import TransitionCommand
from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.entities import Process, ProcessTransition
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from .node_factory import build_process_node


class CreateProcessNodeWithTransition:
    """Create a palette node and its incoming relation in one repository transaction."""

    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id, data):
        process = self.dependencies.process(process_id)
        raw_node = data.get("node") or {}
        node = build_process_node(process_id, process, raw_node)
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
