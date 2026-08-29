from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from uc_bib_solv.modules.bpm.domain.processes.rules import diagram_transitions


class GetProcess:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id, expand_node_id=None):
        try:
            value = self.dependencies.processes.get(process_id)
        except (ValueError, TypeError):
            raise ProcessModelingError("process_id debe ser un UUID válido", "invalid_uuid")
        if not value:
            raise NotFoundError("Proceso no encontrado")
        if expand_node_id:
            return self._expanded_child(value, expand_node_id)
        projection = self._canonical_projection(value)
        projection["diagram_transitions"] = diagram_transitions(
            projection.get("nodes", []), projection.get("transitions", [])
        )
        return jsonable(projection)

    def _expanded_child(self, parent, expand_node_id):
        node = next(
            (item for item in parent.get("nodes", []) if str(item.get("node_id")) == str(expand_node_id)),
            None,
        )
        if not node:
            raise NotFoundError("Nodo de expansión no encontrado")
        if node.get("node_type") != "subprocess" or not node.get("child_process_id"):
            raise ProcessModelingError("El nodo no tiene un proceso hijo expandible", "invalid_expansion")

        try:
            child = self.dependencies.processes.get(node["child_process_id"])
        except (ValueError, TypeError):
            raise ProcessModelingError("child_process_id debe ser un UUID válido", "invalid_uuid")
        if not child:
            raise NotFoundError("Proceso hijo no encontrado")

        projection = self._canonical_projection(child)
        projection["subprocess_context"] = {
            "parent_process_id": parent["process_id"],
            "parent_node_id": node["node_id"],
            "child_process_id": child["process_id"],
            "breadcrumb_label": f"{parent.get('name', 'Proceso padre')} > {node.get('name', 'Subproceso')}",
        }
        projection["diagram_transitions"] = diagram_transitions(
            projection.get("nodes", []), projection.get("transitions", [])
        )
        return jsonable(projection)

    @staticmethod
    def _canonical_projection(process):
        projection = dict(process)
        for transient_key in ("ProcessVersion", "process_version", "version", "version_id", "child_version_id"):
            projection.pop(transient_key, None)
        return projection
