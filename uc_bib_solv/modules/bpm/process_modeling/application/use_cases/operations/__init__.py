from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, NotDraftError, ProcessModelingError
from ..dependencies import ProcessModelingDependencies, jsonable
from ..nodes import CreateNode, DeleteNode


class GetOperation:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, operation_id):
        node = self.dependencies.nodes.get(operation_id)
        if not node:
            raise NotFoundError("Operación no encontrada")
        if node.get("node_type") != "operation":
            raise ProcessModelingError("El nodo no es una operación BPM", "invalid_operation_type")
        return jsonable({
            "operation_id": str(node["node_id"]),
            "process_version_id": str(node["version_id"]),
            "etapas": canonical_stages((node.get("properties") or {}).get("etapas"), envelope=False),
            "schema_version": 1,
            "name": node.get("name"),
            "node_code": node.get("node_code"),
            "properties": node.get("properties") or {},
        })


class UpdateOperationStages:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies
        self.get_operation = GetOperation(dependencies)

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


class CreateOperation:
    """Create an operation node with an operation-specific application contract."""

    def __init__(self, dependencies: ProcessModelingDependencies):
        self.create_node = CreateNode(dependencies)

    def execute(self, version_id, data):
        payload = dict(data)
        payload["node_type"] = "operation"
        return self.create_node.execute(version_id, payload)


class DeleteOperation:
    """Delete an operation after verifying the node type and draft version."""

    def __init__(self, dependencies: ProcessModelingDependencies):
        self.get_operation = GetOperation(dependencies)
        self.delete_node = DeleteNode(dependencies)

    def execute(self, operation_id):
        self.get_operation.execute(operation_id)
        return self.delete_node.execute(operation_id)


__all__ = ["CreateOperation", "DeleteOperation", "GetOperation", "UpdateOperationStages"]
