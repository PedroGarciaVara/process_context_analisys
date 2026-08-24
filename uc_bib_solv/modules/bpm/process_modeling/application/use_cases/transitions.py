from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessTransition
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, NotDraftError, ProcessModelingError
from .dependencies import ProcessModelingDependencies, jsonable


class CreateTransition:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, version_id, data):
        version = self.dependencies.draft(version_id)
        entity = ProcessTransition(
            version_id=version_id,
            **{
                key: value
                for key, value in data.items()
                if key in {"transition_id", "source_node_id", "target_node_id", "transition_type", "label", "condition", "properties"}
            },
        )
        source = self.dependencies.nodes.get(entity.source_node_id)
        target = self.dependencies.nodes.get(entity.target_node_id)
        if not source or not target or str(source["version_id"]) != str(version["version_id"]) or str(target["version_id"]) != str(version["version_id"]):
            raise ProcessModelingError("La transición debe referenciar nodos de la misma versión", "node_reference_missing")
        existing = self.dependencies.version(version_id).get("transitions", [])
        if any(item.get("source_node_id") == entity.source_node_id and item.get("target_node_id") == entity.target_node_id and item.get("transition_type") == entity.transition_type for item in existing):
            raise ProcessModelingError("La transición ya existe", "duplicate_transition")
        return jsonable(self.dependencies.transitions.create(version_id, entity.to_dict()))


class DeleteTransition:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, transition_id):
        transition = self.dependencies.transitions.get(transition_id)
        if not transition:
            raise NotFoundError("Transición no encontrada")
        self.dependencies.draft(transition["version_id"])
        if not self.dependencies.transitions.delete(transition_id):
            raise NotDraftError()
        return {"deleted": True, "transition_id": str(transition_id)}
