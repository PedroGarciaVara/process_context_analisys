from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotDraftError, NotFoundError


class DeleteTransition:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, transition_id):
        transition = self.dependencies.transitions.get(transition_id)
        if not transition:
            raise NotFoundError("Transición no encontrada")
        if not self.dependencies.transitions.delete(transition_id):
            raise NotDraftError()
        return {"deleted": True, "transition_id": str(transition_id)}
