from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError


class GetProcessOperation:
    """Read and validate an operation node from its BPM version."""

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
