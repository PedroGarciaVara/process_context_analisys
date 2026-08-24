"""Process hierarchy and graph invariants."""

from __future__ import annotations

from collections.abc import Iterable

from .entities import ProcessNode, ProcessTransition
from .exceptions import ProcessModelingError
from .value_objects import NODE_TYPES, validate_stock_properties


def _value(item, field):
    return getattr(item, field) if isinstance(item, (ProcessNode, ProcessTransition)) else item.get(field)


def validate_nodes(nodes: Iterable[dict | ProcessNode]) -> list[dict[str, str]]:
    errors = []
    seen = set()
    for node in list(nodes):
        code = _value(node, "node_code") or ""
        node_type = _value(node, "node_type")
        child_process_id = _value(node, "child_process_id")
        output_role = _value(node, "output_role")
        if node_type is not None and node_type not in NODE_TYPES:
            errors.append({"code": "invalid_node_type", "field": "node_type", "message": f"Tipo de nodo no permitido: {node_type}"})
        if node_type == "subprocess" and not child_process_id:
            errors.append({"code": "subprocess_child_required", "field": "child_process_id", "message": "Un subprocess requiere proceso hijo"})
        if node_type != "subprocess" and child_process_id:
            errors.append({"code": "unexpected_child_process", "field": "child_process_id", "message": "Solo un subprocess puede declarar proceso hijo"})
        if node_type == "output" and output_role not in {None, "normal", "waste"}:
            errors.append({"code": "invalid_output_role", "field": "output_role", "message": "output_role debe ser normal o waste"})
        if node_type != "output" and output_role:
            errors.append({"code": "unexpected_output_role", "field": "output_role", "message": "Solo un output puede declarar output_role"})
        if node_type == "stock":
            try:
                validate_stock_properties(_value(node, "properties") or {})
            except ProcessModelingError as exc:
                errors.append({"code": exc.code, "field": "properties.stock", "message": str(exc)})
        if not str(code).strip():
            errors.append({"code": "required_field", "field": "node_code", "message": "node_code es obligatorio"})
        if str(code).strip() and code in seen:
            errors.append({"code": "duplicate_node_code", "field": "node_code", "message": f"Código de nodo duplicado: {code}"})
        seen.add(code)
    return errors


def validate_transitions(transitions: Iterable[dict | ProcessTransition], node_ids: set[str]) -> list[dict[str, str]]:
    transitions = list(transitions)
    errors = []
    adjacency = {node_id: set() for node_id in node_ids}
    for transition in transitions:
        source = _value(transition, "source_node_id")
        target = _value(transition, "target_node_id")
        if source not in node_ids or target not in node_ids:
            errors.append({"code": "node_reference_missing", "field": "transition", "message": "La transición referencia nodos inexistentes"})
        if source == target:
            errors.append({"code": "self_transition", "field": "transition", "message": "Una transición no puede apuntar a sí misma"})
        if source in adjacency and target in adjacency:
            adjacency[source].add(target)
    visiting, visited = set(), set()

    def visit(node_id):
        if node_id in visiting:
            return True
        if node_id in visited:
            return False
        visiting.add(node_id)
        if any(visit(child) for child in adjacency[node_id]):
            return True
        visiting.remove(node_id)
        visited.add(node_id)
        return False

    if any(visit(node_id) for node_id in adjacency):
        errors.append({"code": "graph_cycle", "field": "transition", "message": "El grafo contiene un ciclo"})
    return errors


def validate_decision_branches(nodes, transitions) -> list[dict[str, str]]:
    node_map = {str(_value(node, "node_id")): node for node in nodes}
    errors = []
    for node_id, node in node_map.items():
        if _value(node, "node_type") != "decision":
            continue
        outgoing = [item for item in transitions if str(_value(item, "source_node_id")) == node_id and _value(item, "transition_type") == "branch"]
        labels = [str(_value(item, "label") or "").strip() for item in outgoing]
        if len(labels) != len(set(labels)) or any(not label for label in labels):
            errors.append({"code": "decision_branch_labels_unique", "field": "transition.label", "message": "Las ramas de una decisión requieren etiquetas únicas"})
        if outgoing and set(labels) != {"Sí", "No"}:
            errors.append({"code": "decision_branches_required", "field": "transition.label", "message": "Una decisión requiere ramas Sí y No"})
        for item, label in zip(outgoing, labels):
            target = node_map.get(str(_value(item, "target_node_id")))
            if not target:
                continue
            target_role = _value(target, "output_role")
            if _value(target, "node_type") != "output" or (label == "Sí" and target_role not in {None, "normal"}) or (label == "No" and target_role != "waste"):
                errors.append({"code": "decision_output_role_mismatch", "field": "transition.target_node_id", "message": f"La rama {label or 'sin etiqueta'} no alcanza la salida esperada"})
    return errors


def validate_hierarchy(process_id: str, parent_by_process: dict[str, str | None]) -> list[dict[str, str]]:
    errors = []
    for start in parent_by_process:
        seen = set()
        current = start
        while current:
            if current in seen:
                errors.append({"code": "hierarchy_cycle", "field": "parent_process_id", "message": "La jerarquía contiene un ciclo"})
                break
            seen.add(current)
            current = parent_by_process.get(current)
    return errors


def validate_graph(nodes, transitions, parent_by_process=None) -> dict:
    nodes = list(nodes)
    transitions = list(transitions)
    errors = validate_nodes(nodes)
    node_ids = {_value(node, "node_id") for node in nodes}
    errors.extend(validate_transitions(transitions, node_ids))
    errors.extend(validate_decision_branches(nodes, transitions))
    if parent_by_process is not None:
        errors.extend(validate_hierarchy("", parent_by_process))
    return {"valid": not errors, "errors": errors}
