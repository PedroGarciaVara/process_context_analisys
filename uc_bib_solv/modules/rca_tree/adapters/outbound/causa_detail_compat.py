from __future__ import annotations

from urllib.parse import parse_qs

from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres.causa_detail_compat import (
    create_causa,
    create_hypothesis,
    delete_hypothesis,
    get_causa,
    get_hypothesis,
    list_hypotheses_for_causa,
    update_causa,
    update_hypothesis,
)


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

    hipotesis = get_hypothesis(hipotesis_id) if hipotesis_id else None
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
            "business_reason": "",
            "analysis_method": "",
            "expected_result": "",
            "industrial_process": "",
            "industrial_machine": "",
            "industrial_asset": "",
            "analysis_window": "",
            "decision_rule": "",
            "required_data": [],
            "expected_evidence": [],
        }
    return {
        "descripcion": hypothesis.get("descripcion") or "",
        "tipo": hypothesis.get("tipo") or "aceptacion",
        "criterio_validacion": hypothesis.get("criterio_validacion") or "",
        "estado": hypothesis.get("estado") or "pendiente",
        "business_reason": hypothesis.get("business_reason") or "",
        "analysis_method": hypothesis.get("analysis_method") or "",
        "expected_result": hypothesis.get("expected_result") or "",
        "industrial_process": hypothesis.get("industrial_process") or "",
        "industrial_machine": hypothesis.get("industrial_machine") or "",
        "industrial_asset": hypothesis.get("industrial_asset") or "",
        "analysis_window": hypothesis.get("analysis_window") or "",
        "decision_rule": hypothesis.get("decision_rule") or "",
        "required_data": hypothesis.get("required_data") or [],
        "expected_evidence": hypothesis.get("expected_evidence") or [],
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
    hypotheses = list_hypotheses_for_causa(int(resolved["causa_id"])) if resolved["causa_id"] else []
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


def save_hypothesis(payload: dict) -> dict:
    cause_id = _coerce_int(payload.get("cause_id"))
    hypothesis_id = _coerce_int(payload.get("hypothesis_id"))
    descripcion = (payload.get("descripcion") or "").strip()
    tipo = payload.get("tipo") or "aceptacion"
    criterio_validacion = payload.get("criterio_validacion")
    estado = payload.get("estado") or "pendiente"
    business_reason = payload.get("business_reason")
    analysis_method = payload.get("analysis_method")
    expected_result = payload.get("expected_result")
    industrial_process = payload.get("industrial_process")
    industrial_machine = payload.get("industrial_machine")
    industrial_asset = payload.get("industrial_asset")
    analysis_window = payload.get("analysis_window")
    decision_rule = payload.get("decision_rule")
    required_data = payload.get("required_data") or []
    expected_evidence = payload.get("expected_evidence") or []

    if not cause_id and not hypothesis_id:
        raise ValueError("Se requiere una causa para crear o actualizar una hipotesis.")

    extended = {
        "business_reason": business_reason,
        "analysis_method": analysis_method,
        "expected_result": expected_result,
        "industrial_process": industrial_process,
        "industrial_machine": industrial_machine,
        "industrial_asset": industrial_asset,
        "analysis_window": analysis_window,
        "decision_rule": decision_rule,
        "required_data": required_data,
        "expected_evidence": expected_evidence,
    }
    extended = {key: value for key, value in extended.items() if value not in (None, "") and value != []}

    if hypothesis_id:
        saved = update_hypothesis(
            hypothesis_id,
            descripcion,
            tipo,
            criterio_validacion,
            estado,
            **extended,
        )
        return {"hypothesis": saved, "message": "Hipotesis actualizada."}

    saved = create_hypothesis(
        cause_id,
        descripcion,
        tipo,
        criterio_validacion,
        estado,
        **extended,
    )
    return {"hypothesis": saved, "message": "Hipotesis creada."}


def list_hypotheses(causa_id: int) -> dict:
    return {"causa_id": int(causa_id), "hypotheses": list_hypotheses_for_causa(int(causa_id))}


def get_delete_preview(hypothesis_id: int) -> dict:
    hypothesis = get_hypothesis(int(hypothesis_id))
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
    deleted = delete_hypothesis(int(hypothesis_id))
    if not deleted:
        raise ValueError("Hipotesis no encontrada.")
    return {"deleted": True, "message": "Hipotesis eliminada."}
