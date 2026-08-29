from __future__ import annotations

from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import validate_no_cycle, validate_relationship_signature
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import (
    analisis_causas_repo,
    causa_repo,
    graph_query_repo,
    graph_sync,
    hipotesis_repo,
    node_repo,
    relationship_repo,
)

def _flatten(nodes: list[dict]) -> list[dict]:
    flat: list[dict] = []
    stack = list(nodes)
    while stack:
        node = stack.pop(0)
        copy = {key: value for key, value in node.items() if key != "children"}
        flat.append(copy)
        stack[:0] = list(node.get("children", []) or [])
    return flat


def _get_contract(contract_id: int, contract_context) -> dict | None:
    return contract_context.get_contract(int(contract_id))


def _list_contracts(contract_context) -> list[dict]:
    return contract_context.list_contracts()


def _create_contract(process_id, name, metric=None, objective=None, bpm_process_id=None, bpm_node_id=None, *, contract_context):
    return contract_context.create_contract(process_id, name, metric, objective, bpm_process_id, bpm_node_id)


def _default_contract(contract_id: int | None = None, *, contract_context) -> dict | None:
    if contract_id:
        contract = _get_contract(int(contract_id), contract_context)
        if contract:
            return contract
    contracts = _list_contracts(contract_context)
    return contracts[0] if contracts else None


def _default_selected_cause(causas: list[dict], selected_cause_id: int | None = None) -> dict | None:
    valid_ids = {int(causa["id"]) for causa in causas}
    if selected_cause_id and int(selected_cause_id) in valid_ids:
        return causa_repo.get_by_id(int(selected_cause_id))
    roots = [item for item in causas if item.get("parent_id") is None]
    if roots:
        return roots[0]
    return causas[0] if causas else None


def _ensure_contract_node(contract_id: int, *, contract_context) -> dict:
    contract = _get_contract(int(contract_id), contract_context)
    if not contract:
        raise ValueError("El contrato indicado no existe.")
    return node_repo.get_by_legacy_ref("contrato", int(contract_id)) or graph_sync.sync_contract_graph(int(contract_id))


def _ensure_cause_node(causa_id: int) -> dict:
    cause = causa_repo.get_by_id(int(causa_id))
    if not cause:
        raise ValueError("La causa indicada no existe.")
    return node_repo.get_by_legacy_ref("causa", int(causa_id)) or graph_sync.sync_causa_graph(int(causa_id))


def _resolve_parent_context(
    *,
    contract_id: int | None = None,
    parent_id: int | None = None,
    child_node_type: str = "CAUSE",
    contract_context,
) -> tuple[dict, str, int | None, int | None]:
    if parent_id is not None:
        parent_node = _ensure_cause_node(int(parent_id))
        parent_record = causa_repo.get_by_id(int(parent_id))
        relationship_type = "DEPENDS_ON" if str(child_node_type).upper() == "CONTRACT" else "CAUSES"
        return parent_node, relationship_type, parent_record.get("contrato_id") if parent_record else None, int(parent_id)
    if contract_id is not None:
        parent_node = _ensure_contract_node(int(contract_id), contract_context=contract_context)
        return parent_node, "DEPENDS_ON", int(contract_id), None
    raise ValueError("Se requiere un contrato o una causa padre para crear el vínculo.")


def _resolve_existing_child_ids(parent_node_id: int, relationship_type: str) -> set[int]:
    return {
        int(row["child_node_id"])
        for row in relationship_repo.get_by_parent(int(parent_node_id), relationship_type)
    }


def _build_search_result_item(row: dict, *, already_linked: bool) -> dict:
    node_type = row["node_type"]
    metadata = row.get("metadata") or {}
    if node_type == "CONTRACT":
        process_name = row.get("process_name")
        meta_parts = [value for value in [process_name, row.get("contract_metric")] if value]
        context_label = process_name or "Proceso sin asignar"
        detail_text = row.get("contract_goal") or row.get("description") or "Sin objetivo registrado."
    else:
        process_name = row.get("owner_process_name")
        contract_name = row.get("owner_contract_name")
        meta_parts = [value for value in [process_name, contract_name, metadata.get("categoria")] if value]
        context_label = contract_name or "Contrato no disponible"
        detail_text = row.get("description") or "Sin descripcion registrada."

    return {
        "node_id": int(row["id"]),
        "node_type": node_type,
        "legacy_id": int(row["legacy_id"]) if row.get("legacy_id") is not None else None,
        "legacy_table": row.get("legacy_table"),
        "code": row.get("code"),
        "name": row.get("name"),
        "description": row.get("description"),
        "status": row.get("status"),
        "context_label": context_label,
        "process_name": process_name,
        "contract_name": row.get("contract_name") or row.get("owner_contract_name"),
        "metric": row.get("contract_metric") or row.get("owner_contract_metric"),
        "goal": row.get("contract_goal") or row.get("owner_contract_goal"),
        "detail_text": detail_text,
        "meta": [part for part in meta_parts if part],
        "incoming_relationships": int(row.get("incoming_relationships") or 0),
        "reused": int(row.get("incoming_relationships") or 0) > 1,
        "already_linked": already_linked,
    }


def get_tree_payload(
    view: str,
    selected_cause_id: int | None = None,
    zoom: float = 1.0,
    contract_id: int | None = None,
    *,
    contract_context,
) -> dict:
    contract = _default_contract(contract_id, contract_context=contract_context)
    causas = causa_repo.get_by_contrato(int(contract["id"])) if contract else []
    tree = causa_repo.build_tree(causas)
    flat = _flatten(tree)
    selected_node = _default_selected_cause(causas, selected_cause_id)
    hypotheses_by_cause = {
        str(int(causa["id"])): hipotesis_repo.get_by_causa(int(causa["id"]))
        for causa in causas
    }
    analysis = None
    if contract and view == "analisis_causas_v2":
        sessions = analisis_causas_repo.get_by_contrato(int(contract["id"]))
        analysis = next((item for item in sessions if item.get("estado") == "abierto"), None)
        if analysis is None and sessions:
            analysis = sessions[0]

    title = contract.get("nombre") if contract else "Unassigned contract"
    if view == "analisis_causas_v2":
        analysis_text = f"Analysis #{int(analysis['id'])} · {analysis.get('estado')}" if analysis else "No active analysis"
        subtitle = f"{analysis_text} · Focused node: {selected_node.get('nombre') if selected_node else 'No focused node'}"
        sidebar_subtitle = analysis_text
        action_label = "Provisional Flow"
    else:
        subtitle = f"Focused node: {selected_node.get('nombre') if selected_node else 'No focused node'}"
        sidebar_subtitle = "Tree View"
        action_label = "Add Root Cause"

    reused_node_ids = [int(causa["id"]) for causa in causas if causa.get("reused")]

    return {
        "view": view,
        "contract": contract,
        "analysis": analysis,
        "top_context": {
            "title": title,
            "subtitle": subtitle,
        },
        "sidebar": {
            "title": contract.get("nombre") if contract else "No contract selected",
            "subtitle": sidebar_subtitle,
            "contract_label": "Contract",
            "nav": [
                {"label": "Tree View", "icon": "account_tree", "active": True},
                {"label": "Evidence Log", "icon": "description", "active": False},
                {"label": "Timeline", "icon": "history", "active": False},
                {"label": "Contributors", "icon": "groups", "active": False},
                {"label": "Settings", "icon": "settings", "active": False},
            ],
            "action_label": action_label,
        },
        "zoom": float(zoom or 1.0),
        "selected_cause_id": int(selected_node["id"]) if selected_node else None,
        "tree": tree,
        "hypotheses_by_cause": hypotheses_by_cause,
        "detail": {
            "cause": selected_node,
            "hypotheses": hypotheses_by_cause.get(str(int(selected_node["id"])), []) if selected_node else [],
            "mode": view,
            "context_message": None if contract else "Selecciona un contrato para visualizar el árbol.",
        },
        "legend": [
            {"label": "Retained", "color": "#16a34a"},
            {"label": "Discarded", "color": "#dc2626"},
            {"label": "Pending", "color": "#f59e0b"},
        ],
        "graph_metadata": {
            "reused_node_ids": reused_node_ids,
            "projection_mode": "deterministic_tree_from_dag",
        },
    }


def search_reusable_nodes(
    node_type: str,
    *,
    text: str | None = None,
    contract_id: int | None = None,
    parent_id: int | None = None,
    limit: int = 25,
    contract_context,
) -> list[dict]:
    parent_node, relationship_type, active_contract_id, active_parent_id = _resolve_parent_context(
        contract_id=contract_id,
        parent_id=parent_id,
        child_node_type=node_type,
        contract_context=contract_context,
    )
    rows = graph_query_repo.search_reusable_nodes(node_type, text=text, limit=limit)
    existing_child_ids = _resolve_existing_child_ids(int(parent_node["id"]), relationship_type)

    items: list[dict] = []
    for row in rows:
        if node_type.upper() == "CONTRACT" and active_contract_id is not None and int(row.get("legacy_id") or 0) == int(active_contract_id):
            continue
        if node_type.upper() == "CAUSE" and active_parent_id is not None and int(row.get("legacy_id") or 0) == int(active_parent_id):
            continue
        already_linked = int(row["id"]) in existing_child_ids
        items.append(_build_search_result_item(row, already_linked=already_linked))
    return items


def link_reusable_node(
    *,
    child_node_id: int,
    contract_id: int | None = None,
    parent_id: int | None = None,
    contract_context,
) -> dict:
    child_node = node_repo.get_by_id(int(child_node_id))
    if not child_node:
        raise ValueError("El nodo seleccionado ya no existe.")
    parent_node, relationship_type, active_contract_id, _ = _resolve_parent_context(
        contract_id=contract_id,
        parent_id=parent_id,
        child_node_type=child_node.get("node_type") or "CAUSE",
        contract_context=contract_context,
    )

    validate_relationship_signature(
        parent_node.get("node_type"),
        child_node.get("node_type"),
        relationship_type,
    )
    validate_no_cycle(
        graph_query_repo.get_structural_edges(),
        int(parent_node["id"]),
        int(child_node["id"]),
        relationship_type=relationship_type,
    )
    relationship = relationship_repo.create(
        int(parent_node["id"]),
        int(child_node["id"]),
        relationship_type,
        metadata={"source": "webapp_java", "mode": "manual_link"},
        is_primary=True,
    )

    return {
        "relationship": relationship,
        "parent": {
            "node_id": int(parent_node["id"]),
            "node_type": parent_node["node_type"],
            "legacy_id": int(parent_node["legacy_id"]) if parent_node.get("legacy_id") is not None else None,
        },
        "child": {
            "node_id": int(child_node["id"]),
            "node_type": child_node["node_type"],
            "legacy_id": int(child_node["legacy_id"]) if child_node.get("legacy_id") is not None else None,
            "legacy_table": child_node.get("legacy_table"),
            "name": child_node.get("name"),
        },
        "contract_id": active_contract_id,
    }


def create_contract_child(
    parent_contract_id: int,
    nombre: str,
    *,
    objetivo: str | None = None,
    metrica: str | None = None,
    contract_context,
) -> dict:
    parent_contract = _get_contract(int(parent_contract_id), contract_context)
    if not parent_contract:
        raise ValueError("El contrato base no existe.")

    created_contract = _create_contract(
        int(parent_contract["proceso_id"]),
        nombre,
        metrica,
        objetivo,
        parent_contract.get("bpm_process_id"),
        parent_contract.get("bpm_node_id"),
        contract_context=contract_context,
    )
    graph_sync.sync_contract_graph(int(created_contract["id"]))
    parent_node = _ensure_contract_node(int(parent_contract_id), contract_context)
    child_node = _ensure_contract_node(int(created_contract["id"]), contract_context)

    validate_relationship_signature(
        parent_node.get("node_type"),
        child_node.get("node_type"),
        "DEPENDS_ON",
    )
    validate_no_cycle(
        graph_query_repo.get_structural_edges(),
        int(parent_node["id"]),
        int(child_node["id"]),
        relationship_type="DEPENDS_ON",
    )
    relationship = relationship_repo.create(
        int(parent_node["id"]),
        int(child_node["id"]),
        "DEPENDS_ON",
        metadata={"source": "webapp_java", "mode": "create_contract_child"},
        is_primary=True,
    )

    return {
        "contract": created_contract,
        "relationship": relationship,
        "parent_contract_id": int(parent_contract_id),
    }


def get_causa(causa_id: int) -> dict | None:
    return causa_repo.get_by_id(int(causa_id))


def list_causas_for_contract(contrato_id: int) -> list[dict]:
    return causa_repo.get_by_contrato(int(contrato_id))


def create_causa(
    contrato_id: int,
    nombre: str,
    descripcion: str | None = None,
    tipo: str = "causa",
    categoria: str | None = None,
    parent_id: int | None = None,
) -> dict:
    return causa_repo.create(int(contrato_id), nombre, descripcion, tipo, categoria, parent_id=parent_id)


def update_causa(
    causa_id: int,
    nombre: str,
    descripcion: str | None = None,
    tipo: str = "causa",
    categoria: str | None = None,
) -> dict:
    return causa_repo.update(int(causa_id), nombre, descripcion, tipo, categoria)


def delete_causa(causa_id: int) -> bool:
    return causa_repo.delete(int(causa_id))


def list_hipotesis_for_causa(causa_id: int) -> list[dict]:
    return hipotesis_repo.get_by_causa(int(causa_id))


def get_hipotesis(hipotesis_id: int) -> dict | None:
    return hipotesis_repo.get_by_id(int(hipotesis_id))


def create_hipotesis(
    causa_id: int,
    descripcion: str,
    tipo: str = "aceptacion",
    criterio_validacion: str | None = None,
    estado: str = "pendiente",
    **kwargs,
) -> dict:
    return hipotesis_repo.create(int(causa_id), descripcion, tipo, criterio_validacion, estado, **kwargs)


def update_hipotesis(
    hipotesis_id: int,
    descripcion: str,
    tipo: str,
    criterio_validacion: str | None,
    estado: str,
    **kwargs,
) -> dict:
    return hipotesis_repo.update(int(hipotesis_id), descripcion, tipo, criterio_validacion, estado, **kwargs)


def delete_hipotesis(hipotesis_id: int) -> bool:
    return hipotesis_repo.delete(int(hipotesis_id))
