from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError


class UpdateNodeMetadata:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id, data):
        node = self.dependencies.nodes.get(node_id)
        if not node:
            raise NotFoundError("Nodo no encontrado")
        metadata = data.get("metadata", data)
        if not isinstance(metadata, dict):
            raise ProcessModelingError("Los metadatos deben ser un objeto JSON", "metadata_object_required")
        if any(key in metadata for key in ("context_type", "family", "schema_version", "data", "source", "provenance")):
            from uc_bib_solv.modules.bpm.domain.processes.context import ContextDetail
            metadata = ContextDetail.from_payload(metadata, str(node_id)).to_dict()
        result = self.dependencies.nodes.upsert_metadata(node_id, metadata)
        return jsonable({"node_id": str(node_id), "metadata": result["metadata"], "updated_at": result["updated_at"]})
