from __future__ import annotations

from collections.abc import Iterable

from .entities import ProcessNode, ProcessTransition
from .value_objects import NODE_TYPES, validate_stock_properties


def validate_nodes(nodes: Iterable[dict | ProcessNode]) -> list[dict[str, str]]:
    nodes = list(nodes)
    errors = []
    seen = set()
    for raw in nodes:
        node = raw if isinstance(raw, ProcessNode) else raw
        code = node.node_code if isinstance(node, ProcessNode) else node.get("node_code", "")
        node_type = node.node_type if isinstance(node, ProcessNode) else node.get("node_type")
        if node_type is not None and node_type not in NODE_TYPES:
            errors.append({"code": "invalid_node_type", "field": "node_type", "message": f"Tipo de nodo no permitido: {node_type}"})
        child_process_id = node.child_process_id if isinstance(node, ProcessNode) else node.get("child_process_id")
        if node_type == "subprocess" and not child_process_id:
            errors.append({"code": "subprocess_child_required", "field": "child_process_id", "message": "Un subprocess requiere proceso hijo"})
        if node_type != "subprocess" and child_process_id:
            errors.append({"code": "unexpected_child_process", "field": "child_process_id", "message": "Solo un subprocess puede declarar proceso hijo"})
        output_role = node.output_role if isinstance(node, ProcessNode) else node.get("output_role")
        if node_type == "output" and output_role not in {None, "normal", "waste"}:
            errors.append({"code": "invalid_output_role", "field": "output_role", "message": "output_role debe ser normal o waste"})
        if node_type != "output" and output_role:
            errors.append({"code": "unexpected_output_role", "field": "output_role", "message": "Solo un output puede declarar output_role"})
        if node_type == "stock":
            try:
                validate_stock_properties(node.properties if isinstance(node, ProcessNode) else node.get("properties") or {})
            except ValueError as exc:
                errors.append({"code": getattr(exc, "code", "invalid_stock"), "field": "properties.stock", "message": str(exc)})
        if not str(code).strip():
            errors.append({"code": "required_field", "field": "node_code", "message": "node_code es obligatorio"})
        if str(code).strip() and code in seen:
            errors.append({"code": "duplicate_node_code", "field": "node_code", "message": f"Código de nodo duplicado: {code}"})
        seen.add(code)
    return errors


def validate_transitions(transitions: Iterable[dict | ProcessTransition], node_ids: set[str]) -> list[dict[str, str]]:
    transitions = list(transitions)
    errors = []
    for raw in transitions:
        transition = raw if isinstance(raw, ProcessTransition) else raw
        source = transition.source_node_id if isinstance(transition, ProcessTransition) else transition.get("source_node_id")
        target = transition.target_node_id if isinstance(transition, ProcessTransition) else transition.get("target_node_id")
        if source not in node_ids or target not in node_ids:
            errors.append({"code": "node_reference_missing", "field": "transition", "message": "La transición referencia nodos inexistentes"})
        if source == target:
            errors.append({"code": "self_transition", "field": "transition", "message": "Una transición no puede apuntar a sí misma"})
    adjacency = {node_id: set() for node_id in node_ids}
    for raw in transitions:
        source = raw.source_node_id if isinstance(raw, ProcessTransition) else raw.get("source_node_id")
        target = raw.target_node_id if isinstance(raw, ProcessTransition) else raw.get("target_node_id")
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
    node_map = {str(node.node_id if isinstance(node, ProcessNode) else node.get("node_id")): node for node in nodes}
    errors = []
    for node_id, node in node_map.items():
        node_type = node.node_type if isinstance(node, ProcessNode) else node.get("node_type")
        if node_type != "decision":
            continue
        outgoing = [item for item in transitions if str(item.source_node_id if isinstance(item, ProcessTransition) else item.get("source_node_id")) == node_id and (item.transition_type if isinstance(item, ProcessTransition) else item.get("transition_type")) == "branch"]
        labels = [str(item.label if isinstance(item, ProcessTransition) else item.get("label") or "").strip() for item in outgoing]
        if len(labels) != len(set(labels)) or any(not label for label in labels):
            errors.append({"code": "decision_branch_labels_unique", "field": "transition.label", "message": "Las ramas de una decisión requieren etiquetas únicas"})
        if outgoing and set(labels) != {"Sí", "No"}:
            errors.append({"code": "decision_branches_required", "field": "transition.label", "message": "Una decisión requiere ramas Sí y No"})
        for item, label in zip(outgoing, labels):
            target_id = str(item.target_node_id if isinstance(item, ProcessTransition) else item.get("target_node_id"))
            target = node_map.get(target_id)
            target_type = target.node_type if isinstance(target, ProcessNode) else target.get("node_type") if target else None
            target_role = target.output_role if isinstance(target, ProcessNode) else target.get("output_role") if target else None
            if target_type != "output" or (label == "Sí" and target_role not in {None, "normal"}) or (label == "No" and target_role != "waste"):
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
    node_ids = {n.node_id if isinstance(n, ProcessNode) else n.get("node_id") for n in nodes}
    errors.extend(validate_transitions(transitions, node_ids))
    errors.extend(validate_decision_branches(nodes, transitions))
    if parent_by_process is not None:
        errors.extend(validate_hierarchy("", parent_by_process))
    return {"valid": not errors, "errors": errors}
