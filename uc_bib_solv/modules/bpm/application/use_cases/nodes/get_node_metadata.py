from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError


class GetNodeMetadata:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id):
        if not self.dependencies.nodes.get(node_id):
            raise NotFoundError("Nodo no encontrado")
        return {"node_id": str(node_id), "metadata": self.dependencies.nodes.get_metadata(node_id)}
