from uc_bib_solv.modules.bpm.application.dto.commands import TransitionCommand
from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.entities import Process, ProcessTransition
from uc_bib_solv.modules.bpm.domain.processes.exceptions import ProcessModelingError


class CreateTransition:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id, data):
        entity = ProcessTransition(process_id=process_id, **TransitionCommand.from_payload(data).to_dict())
        source = self.dependencies.nodes.get(entity.source_node_id)
        target = self.dependencies.nodes.get(entity.target_node_id)
        if not source or not target or str(source["process_id"]) != str(process_id) or str(target["process_id"]) != str(process_id):
            raise ProcessModelingError("La transición debe referenciar nodos del mismo proceso", "node_reference_missing")
        process = self.dependencies.process(process_id)
        existing = process.get("transitions", [])
        process_entity = Process(**{key: process[key] for key in ("process_id", "process_code", "name", "description", "parent_process_id", "abstraction_level", "status")})
        process_entity.assert_graph_consistent(process.get("nodes", []), [*existing, entity])
        return jsonable(self.dependencies.transitions.create(process_id, entity.to_dict()))
