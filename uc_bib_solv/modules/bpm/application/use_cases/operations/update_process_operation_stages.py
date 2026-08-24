from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotDraftError, NotFoundError, ProcessModelingError
from .get_operation import GetProcessOperation


class UpdateProcessOperationStages:
    """Update the stages belonging to a BPM operation node."""

    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies
        self.get_operation = GetProcessOperation(dependencies)

    def execute(self, operation_id, data):
        node = self.dependencies.nodes.get(operation_id)
        if not node:
            raise NotFoundError("Operación no encontrada")
        if node.get("node_type") != "operation":
            raise ProcessModelingError("El nodo no es una operación BPM", "invalid_operation_type")
        if "process_version_id" in data and str(data["process_version_id"]) != str(node["version_id"]):
            raise ProcessModelingError("La operación no pertenece a process_version_id", "operation_version_mismatch")
        if "etapas" not in data:
            raise ProcessModelingError("etapas es obligatorio para actualizar la operación", "stages_required")
        result = self.dependencies.nodes.update_stages(operation_id, data["etapas"])
        if not result:
            raise NotDraftError()
        return self.get_operation.execute(operation_id)
