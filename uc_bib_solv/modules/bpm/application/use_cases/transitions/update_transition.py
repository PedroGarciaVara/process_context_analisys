from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.entities import Process, ProcessTransition
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError


class UpdateTransition:
    """Edit transition semantics while keeping identity and graph ownership stable."""

    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, transition_id, data):
        current = self.dependencies.transitions.get(transition_id)
        if not current:
            raise NotFoundError("Transición no encontrada")
        merged = dict(current)
        merged.update({key: value for key, value in data.items() if key in {
            "source_node_id", "target_node_id", "transition_type", "label", "condition", "properties"
        }})
        merged["transition_id"] = current["transition_id"]
        merged["process_id"] = current["process_id"]
        entity = ProcessTransition(**{key: merged[key] for key in (
            "transition_id", "process_id", "source_node_id", "target_node_id",
            "transition_type", "label", "condition", "properties"
        )})
        source = self.dependencies.nodes.get(entity.source_node_id)
        target = self.dependencies.nodes.get(entity.target_node_id)
        if not source or not target or str(source["process_id"]) != str(entity.process_id) or str(target["process_id"]) != str(entity.process_id):
            raise ProcessModelingError("La transición debe referenciar nodos del mismo proceso", "node_reference_missing")
        process = self.dependencies.process(entity.process_id)
        transitions = [entity if str(item["transition_id"]) == str(transition_id) else item for item in process.get("transitions", [])]
        process_entity = Process(**{key: process[key] for key in (
            "process_id", "process_code", "name", "description", "parent_process_id", "abstraction_level", "status"
        )})
        process_entity.assert_graph_consistent(process.get("nodes", []), transitions)
        return jsonable(self.dependencies.transitions.update(transition_id, entity.to_dict()))
