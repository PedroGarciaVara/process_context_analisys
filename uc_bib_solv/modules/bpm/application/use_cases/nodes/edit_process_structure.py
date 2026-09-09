"""Atomic structural edits for the BPM process graph."""

from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.entities import Process, ProcessTransition
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from uc_bib_solv.modules.bpm.domain.processes.rules import next_node_code
from .node_factory import build_process_node


def _process_entity(process):
    return Process(**{key: process[key] for key in (
        "process_id", "process_code", "name", "description", "parent_process_id", "abstraction_level", "status",
    )})


class InsertOperationOnTransition:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id, transition_id, data):
        process = self.dependencies.process(process_id)
        edge = next((item for item in process.get("transitions", []) if str(item.get("transition_id")) == str(transition_id)), None)
        if not edge:
            raise NotFoundError("Transición no encontrada")
        nodes = {str(item.get("node_id")): item for item in process.get("nodes", [])}
        source = nodes.get(str(edge.get("source_node_id")))
        target = nodes.get(str(edge.get("target_node_id")))
        if not source or not target:
            raise ProcessModelingError("La transición referencia nodos inexistentes", "node_reference_missing")
        if edge.get("transition_type") != "sequence":
            raise ProcessModelingError("Solo se pueden insertar operaciones en una relación sequence", "invalid_transition_type")
        raw = {**(data or {}), "node_type": "operation", "node_code": next_node_code(process.get("nodes", []), "operation")}
        node = build_process_node(process_id, process, raw)
        first = ProcessTransition(process_id=process_id, source_node_id=source["node_id"], target_node_id=node.node_id,
                                  transition_type="sequence", label=edge.get("label"), condition=edge.get("condition"),
                                  properties=edge.get("properties") or {})
        second = ProcessTransition(process_id=process_id, source_node_id=node.node_id, target_node_id=target["node_id"],
                                   transition_type="sequence", label=edge.get("label"), condition=edge.get("condition"),
                                   properties=edge.get("properties") or {})
        remaining = [item for item in process.get("transitions", []) if str(item.get("transition_id")) != str(transition_id)]
        _process_entity(process).assert_graph_consistent([*process.get("nodes", []), node], [*remaining, first, second])
        return jsonable(self.dependencies.nodes.insert_operation_on_transition(process_id, node.to_dict(), edge, first.to_dict(), second.to_dict()))


class DeleteOperation:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id, reconnect=False):
        node = self.dependencies.nodes.get(node_id)
        if not node:
            raise NotFoundError("Nodo no encontrado")
        if node.get("node_type") != "operation":
            raise ProcessModelingError("Solo se puede aplicar esta acción a una operación", "invalid_node_type")
        process = self.dependencies.process(node["process_id"])
        incoming = [edge for edge in process.get("transitions", []) if str(edge.get("target_node_id")) == str(node_id)]
        outgoing = [edge for edge in process.get("transitions", []) if str(edge.get("source_node_id")) == str(node_id)]
        reconnect_edges = []
        if reconnect:
            if len(incoming) != 1 or len(outgoing) != 1:
                raise ProcessModelingError("La reconexión requiere exactamente una entrada y una salida", "reconnect_requires_single_line")
            outgoing_edge = outgoing[0]
            reconnect_edges.append(ProcessTransition(
                process_id=node["process_id"], source_node_id=incoming[0]["source_node_id"], target_node_id=outgoing_edge["target_node_id"],
                transition_type="sequence", label=incoming[0].get("label"), condition=incoming[0].get("condition"),
                properties=incoming[0].get("properties") or {},
            ).to_dict())
        remove_ids = {str(node_id)}
        remaining_nodes = [item for item in process.get("nodes", []) if str(item.get("node_id")) not in remove_ids]
        remaining_transitions = [edge for edge in process.get("transitions", []) if str(edge.get("source_node_id")) != str(node_id) and str(edge.get("target_node_id")) != str(node_id)]
        _process_entity(process).assert_graph_consistent(remaining_nodes, [*remaining_transitions, *reconnect_edges])
        return jsonable(self.dependencies.nodes.delete_with_reconnect(node_id, reconnect_edges))


__all__ = ["DeleteOperation", "InsertOperationOnTransition"]
