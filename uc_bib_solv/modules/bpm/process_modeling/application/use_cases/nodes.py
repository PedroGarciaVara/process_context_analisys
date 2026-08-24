from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages
from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessNode
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from .dependencies import ProcessModelingDependencies, jsonable


class CreateNode:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, version_id, data):
        self.dependencies.draft(version_id)
        node_data = {
            key: value for key, value in data.items()
            if key in {"node_id", "node_code", "node_type", "name", "description", "child_process_id", "output_role", "properties"}
        }
        if "etapas" in data:
            node_data.setdefault("properties", {})["etapas"] = canonical_stages(data["etapas"], envelope=True)
        if "stock" in data:
            node_data.setdefault("properties", {})["stock"] = data["stock"]
        entity = ProcessNode(version_id=version_id, **node_data)
        if entity.child_process_id and not self.dependencies.processes.get(entity.child_process_id):
            raise NotFoundError("Proceso hijo no encontrado")
        if entity.child_process_id and self.dependencies.hierarchy_contains(self.dependencies.version(version_id)["process_id"], entity.child_process_id):
            raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
        existing = self.dependencies.version(version_id).get("nodes", [])
        if any(item.get("node_code") == entity.node_code for item in existing):
            raise ProcessModelingError("El código de nodo ya existe en la versión", "duplicate_node_code")
        return jsonable(self.dependencies.nodes.create(version_id, entity.to_dict()))


class UpdateNode:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id, data):
        node = self.dependencies.nodes.get(node_id)
        if not node:
            raise NotFoundError("Nodo no encontrado")
        self.dependencies.draft(node["version_id"])
        merged = dict(node)
        merged.update(data)
        if "etapas" in data:
            merged["properties"] = dict(node.get("properties") or {})
            merged["properties"]["etapas"] = canonical_stages(data["etapas"], envelope=True)
        entity = ProcessNode(**{key: merged[key] for key in ("node_id", "version_id", "node_code", "node_type", "name", "description", "child_process_id", "output_role", "properties")})
        if entity.child_process_id and not self.dependencies.processes.get(entity.child_process_id):
            raise NotFoundError("Proceso hijo no encontrado")
        version_nodes = self.dependencies.version(node["version_id"]).get("nodes", [])
        if any(item.get("node_id") != node_id and item.get("node_code") == entity.node_code for item in version_nodes):
            raise ProcessModelingError("El código de nodo ya existe en la versión", "duplicate_node_code")
        return jsonable(self.dependencies.nodes.update(node_id, entity.to_dict()))


class DeleteNode:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id):
        node = self.dependencies.nodes.get(node_id)
        if not node:
            raise NotFoundError("Nodo no encontrado")
        self.dependencies.draft(node["version_id"])
        if not self.dependencies.nodes.delete(node_id):
            raise ProcessModelingError("No se pudo eliminar el nodo", "node_delete_failed")
        return {"deleted": True, "node_id": str(node_id)}


class GetNodeMetadata:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id):
        if not self.dependencies.nodes.get(node_id):
            raise NotFoundError("Nodo no encontrado")
        return {"node_id": str(node_id), "metadata": self.dependencies.nodes.get_metadata(node_id)}


class UpdateNodeMetadata:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id, data):
        node = self.dependencies.nodes.get(node_id)
        if not node:
            raise NotFoundError("Nodo no encontrado")
        self.dependencies.draft(node["version_id"])
        metadata = data.get("metadata", data)
        if not isinstance(metadata, dict):
            raise ProcessModelingError("Los metadatos deben ser un objeto JSON", "metadata_object_required")
        if any(key in metadata for key in ("context_type", "family", "schema_version", "data", "source", "provenance")):
            from uc_bib_solv.modules.bpm.domain.processes.context import ContextDetail
            metadata = ContextDetail.from_payload(metadata, str(node_id)).to_dict()
        result = self.dependencies.nodes.upsert_metadata(node_id, metadata)
        return jsonable({"node_id": str(node_id), "metadata": result["metadata"], "updated_at": result["updated_at"]})
