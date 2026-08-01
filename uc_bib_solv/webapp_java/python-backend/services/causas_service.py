from urllib.parse import parse_qs

from repositories.causas_repository import (
    create_contract_child as create_contract_child_repository,
    create_causa,
    create_hipotesis,
    delete_causa,
    delete_hipotesis,
    get_causa,
    get_hipotesis,
    link_reusable_node as link_reusable_node_repository,
    search_reusable_nodes as search_reusable_nodes_repository,
    get_tree_payload as get_tree_repository_payload,
    list_causas_for_contract,
    list_hipotesis_for_causa,
    update_causa,
    update_hipotesis,
)


def get_tree_payload(
    view: str,
    selected_cause_id: int | None = None,
    zoom: float = 1.0,
    contract_id: int | None = None,
) -> dict:
    if view not in {"arbol", "analisis_causas_v2"}:
        view = "arbol"
    payload = get_tree_repository_payload(
        view,
        selected_cause_id=selected_cause_id,
        zoom=zoom,
        contract_id=contract_id,
    )
    payload["status"] = "ok"
    return payload


def _coerce_int(value):
    if value in (None, "", []):
        return None
    return int(value)


def parse_query_string(search: str | None) -> dict[str, str]:
    if not search:
        return {}
    parsed = parse_qs(search.lstrip("?"), keep_blank_values=True)
    return {key: values[-1] for key, values in parsed.items() if values}


def _resolve_detail_context(params: dict[str, object]) -> dict:
    contract_id = _coerce_int(params.get("contrato_id"))
    causa_id = _coerce_int(params.get("causa_id"))
    parent_id = _coerce_int(params.get("parent_id"))
    hipotesis_id = _coerce_int(params.get("hipotesis_id"))

    hipotesis = get_hipotesis(hipotesis_id) if hipotesis_id else None
    if hipotesis and not causa_id:
        causa_id = int(hipotesis["causa_id"])

    causa = get_causa(causa_id) if causa_id else None
    if causa and not contract_id:
        contract_id = int(causa["contrato_id"])

    if parent_id and not contract_id:
        parent = get_causa(parent_id)
        if parent:
            contract_id = int(parent["contrato_id"])

    if not causa_id and not parent_id and not hipotesis_id:
        mode = "new_root"
    elif hipotesis_id:
        mode = "edit_hipotesis"
    elif causa_id:
        mode = "edit_cause"
    elif parent_id:
        mode = "new_child"
    else:
        mode = "new_root"

    return {
        "contract_id": contract_id,
        "causa_id": causa_id,
        "parent_id": parent_id,
        "hipotesis_id": hipotesis_id,
        "mode": mode,
        "cause": causa,
        "hipotesis": hipotesis,
    }


def _context_items(contract_id, causa_id, parent_id, hipotesis_id, mode, cause, hipotesis):
    items = []
    if contract_id:
        items.append({"label": "Contrato", "value": f"#{contract_id}"})
    if causa_id and cause:
        items.append({"label": "Causa", "value": f"#{cause['id']} {cause['nombre']}"})
    elif parent_id:
        items.append({"label": "Parent", "value": f"#{parent_id}"})
    if hipotesis_id and hipotesis:
        items.append({"label": "Hipotesis", "value": f"#{hipotesis['id']} {hipotesis['descripcion']}"})
    items.append({"label": "Mode", "value": mode})
    return items


def _cause_form_values(cause, mode: str) -> dict:
    if not cause or mode in {"new_root", "new_child"}:
        return {"nombre": "", "tipo": "causa", "categoria": "", "descripcion": ""}
    return {
        "nombre": cause.get("nombre") or "",
        "tipo": cause.get("tipo") or "causa",
        "categoria": cause.get("categoria") or "",
        "descripcion": cause.get("descripcion") or "",
    }


def _hypothesis_form_values(hypothesis, mode: str) -> dict:
    if not hypothesis or mode == "new_hipotesis":
        return {
            "descripcion": "",
            "tipo": "aceptacion",
            "criterio_validacion": "",
            "estado": "pendiente",
        }
    return {
        "descripcion": hypothesis.get("descripcion") or "",
        "tipo": hypothesis.get("tipo") or "aceptacion",
        "criterio_validacion": hypothesis.get("criterio_validacion") or "",
        "estado": hypothesis.get("estado") or "pendiente",
    }


def _cause_save_label(mode: str, causa_id: int | None, parent_id: int | None) -> str:
    if causa_id:
        return "Actualizar causa"
    if mode == "new_child" and parent_id:
        return "Crear causa hija"
    return "Guardar causa"


def _hypothesis_save_label(mode: str, hypothesis_id: int | None) -> str:
    return "Actualizar hipotesis" if hypothesis_id and mode == "edit_hipotesis" else "Guardar hipotesis"


def get_detail_payload(params: dict[str, object]) -> dict:
    resolved = _resolve_detail_context(params)
    hypotheses = list_hipotesis_for_causa(int(resolved["causa_id"])) if resolved["causa_id"] else []
    ready = bool(resolved["contract_id"])
    return {
        "contract_id": resolved["contract_id"],
        "causa_id": resolved["causa_id"],
        "parent_id": resolved["parent_id"],
        "hipotesis_id": resolved["hipotesis_id"],
        "mode": resolved["mode"],
        "ready": ready,
        "context_items": _context_items(
            resolved["contract_id"],
            resolved["causa_id"],
            resolved["parent_id"],
            resolved["hipotesis_id"],
            resolved["mode"],
            resolved["cause"],
            resolved["hipotesis"],
        ),
        "context_message": "Selecciona un contrato para continuar." if not ready else "Detalle listo para edicion.",
        "cause": resolved["cause"],
        "hipotesis": resolved["hipotesis"],
        "cause_form": _cause_form_values(resolved["cause"], resolved["mode"]),
        "hypothesis_form": _hypothesis_form_values(resolved["hipotesis"], resolved["mode"]),
        "hypotheses": hypotheses,
        "labels": {
            "cause_save": _cause_save_label(resolved["mode"], resolved["causa_id"], resolved["parent_id"]),
            "hypothesis_save": _hypothesis_save_label(resolved["mode"], resolved["hipotesis_id"]),
        },
    }


def save_cause(payload: dict) -> dict:
    contract_id = _coerce_int(payload.get("contract_id"))
    causa_id = _coerce_int(payload.get("causa_id"))
    parent_id = _coerce_int(payload.get("parent_id"))
    nombre = (payload.get("nombre") or "").strip()
    descripcion = payload.get("descripcion")
    tipo = payload.get("tipo") or "causa"
    categoria = payload.get("categoria")

    if not contract_id and not causa_id:
        raise ValueError("Se requiere un contrato para crear o actualizar una causa.")

    if causa_id:
        saved = update_causa(causa_id, nombre, descripcion, tipo, categoria)
        return {"cause": saved, "message": "Causa actualizada."}

    saved = create_causa(contract_id, nombre, descripcion, tipo, categoria, parent_id=parent_id)
    return {"cause": saved, "message": "Causa creada."}


def delete_causa_record(causa_id: int) -> dict:
    deleted = delete_causa(int(causa_id))
    if not deleted:
        raise ValueError("Causa no encontrada.")
    return {"deleted": True, "message": "Causa eliminada."}


def search_reusable_nodes(params: dict[str, object]) -> dict:
    node_type = (params.get("node_type") or "CAUSE").strip()
    text = (params.get("text") or "").strip() or None
    contract_id = _coerce_int(params.get("contract_id"))
    parent_id = _coerce_int(params.get("parent_id"))
    limit = _coerce_int(params.get("limit")) or 25

    items = search_reusable_nodes_repository(
        node_type,
        text=text,
        contract_id=contract_id,
        parent_id=parent_id,
        limit=max(1, min(limit, 100)),
    )
    return {
        "node_type": node_type.upper(),
        "items": items,
        "count": len(items),
    }


def link_reusable_node(payload: dict) -> dict:
    contract_id = _coerce_int(payload.get("contract_id"))
    parent_id = _coerce_int(payload.get("parent_id"))
    child_node_id = _coerce_int(payload.get("child_node_id"))
    if not child_node_id:
        raise ValueError("Selecciona un nodo reutilizable antes de vincular.")

    result = link_reusable_node_repository(
        child_node_id=child_node_id,
        contract_id=contract_id,
        parent_id=parent_id,
    )
    child_type = result["child"]["node_type"]
    message = "Nodo existente vinculado."
    if child_type == "CONTRACT":
        message = "Contrato existente vinculado."
    elif child_type == "CAUSE":
        message = "Causa existente vinculada."

    return {
        **result,
        "message": message,
    }


def create_contract_node(payload: dict) -> dict:
    contract_id = _coerce_int(payload.get("contract_id"))
    nombre = (payload.get("nombre") or "").strip()
    objetivo = (payload.get("descripcion") or "").strip() or None
    metrica = (payload.get("categoria") or "").strip() or None

    if not contract_id:
        raise ValueError("Se requiere un contrato activo para crear un contrato hijo.")
    if not nombre:
        raise ValueError("El nombre del contrato es obligatorio.")

    result = create_contract_child_repository(
        int(contract_id),
        nombre,
        objetivo=objetivo,
        metrica=metrica,
    )
    return {
        **result,
        "message": "Contrato creado y vinculado.",
    }


def save_hypothesis(payload: dict) -> dict:
    cause_id = _coerce_int(payload.get("cause_id"))
    hypothesis_id = _coerce_int(payload.get("hypothesis_id"))
    descripcion = (payload.get("descripcion") or "").strip()
    tipo = payload.get("tipo") or "aceptacion"
    criterio_validacion = payload.get("criterio_validacion")
    estado = payload.get("estado") or "pendiente"

    if not cause_id and not hypothesis_id:
        raise ValueError("Se requiere una causa para crear o actualizar una hipotesis.")

    if hypothesis_id:
        saved = update_hipotesis(hypothesis_id, descripcion, tipo, criterio_validacion, estado)
        return {"hypothesis": saved, "message": "Hipotesis actualizada."}

    saved = create_hipotesis(cause_id, descripcion, tipo, criterio_validacion, estado)
    return {"hypothesis": saved, "message": "Hipotesis creada."}


def list_hypotheses(causa_id: int) -> dict:
    return {"causa_id": int(causa_id), "hypotheses": list_hipotesis_for_causa(int(causa_id))}


def get_delete_preview(hypothesis_id: int) -> dict:
    hypothesis = get_hipotesis(int(hypothesis_id))
    if not hypothesis:
        raise ValueError("Hipotesis no encontrada.")
    cause = get_causa(int(hypothesis["causa_id"]))
    cause_name = cause["nombre"] if cause else "Causa desconocida"
    description = hypothesis.get("descripcion") or "Hipotesis sin descripcion"
    state = hypothesis.get("estado") or "pendiente"
    return {
        "hipotesis_id": int(hypothesis["id"]),
        "causa_id": int(hypothesis["causa_id"]),
        "title": "Confirmar eliminacion de hipotesis",
        "message": f"Vas a eliminar '{description}'.",
        "detail": f"Causa vinculada: {cause_name} | Estado actual: {state}",
        "confirm_label": "Eliminar",
        "cancel_label": "Cancelar",
        "tone": "danger",
    }


def delete_hypothesis_record(hypothesis_id: int) -> dict:
    deleted = delete_hipotesis(int(hypothesis_id))
    if not deleted:
        raise ValueError("Hipotesis no encontrada.")
    return {"deleted": True, "message": "Hipotesis eliminada."}
