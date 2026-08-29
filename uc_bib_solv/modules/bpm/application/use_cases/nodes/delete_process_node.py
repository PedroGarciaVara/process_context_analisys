from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError


class DeleteProcessNode:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id):
        node = self.dependencies.nodes.get(node_id)
        if not node:
            raise NotFoundError("Nodo no encontrado")
        if not self.dependencies.nodes.delete(node_id):
            raise ProcessModelingError("No se pudo eliminar el nodo", "node_delete_failed")
        return {"deleted": True, "node_id": str(node_id)}
