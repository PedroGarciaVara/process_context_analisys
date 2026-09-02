from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError


class DeleteProcess:
    """Delete a BPM process after confirming it still exists."""

    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id, cascade=False):
        process = self.dependencies.process(process_id)
        if not self.dependencies.processes.delete(process_id, cascade=cascade):
            raise NotFoundError("Proceso no encontrado")
        return {"deleted": True, "process_id": str(process["process_id"])}
