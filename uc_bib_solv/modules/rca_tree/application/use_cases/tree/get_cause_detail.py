from typing import Any

from ...dto import contract_id as normalize_contract_id, integer
from ...ports.outbound import CauseRepositoryPort, HypothesisRepositoryPort


def _context_items(contract_id, cause_id, parent_id, hypothesis_id, mode, cause, hypothesis):
    items = []
    if contract_id:
        items.append({"label": "Contrato", "value": f"#{contract_id}"})
    if cause_id and cause:
        items.append({"label": "Causa", "value": f"#{cause['id']} {cause['nombre']}"})
    elif parent_id:
        items.append({"label": "Parent", "value": f"#{parent_id}"})
    if hypothesis_id and hypothesis:
        items.append({"label": "Hipotesis", "value": f"#{hypothesis['id']} {hypothesis['descripcion']}"})
    items.append({"label": "Mode", "value": mode})
    return items


def _cause_form_values(cause, mode):
    if not cause or mode in {"new_root", "new_child"}:
        return {"nombre": "", "tipo": "causa", "categoria": "", "descripcion": ""}
    return {"nombre": cause.get("nombre") or "", "tipo": cause.get("tipo") or "causa", "categoria": cause.get("categoria") or "", "descripcion": cause.get("descripcion") or ""}


def _hypothesis_form_values(hypothesis, mode):
    if not hypothesis or mode == "new_hipotesis":
        return {"nombre": "", "descripcion": "", "criterio_validacion": "", "metodo": ""}
    return {
        "nombre": hypothesis.get("nombre") or hypothesis.get("name") or "",
        "descripcion": hypothesis.get("descripcion") or "",
        "criterio_validacion": hypothesis.get("criterio_validacion") or "",
        "metodo": hypothesis.get("metodo") or hypothesis.get("method") or "",
    }


class GetCauseDetail:
    """Resolve the cause/hypothesis editing context used by the UI."""

    def __init__(self, causes: CauseRepositoryPort, hypotheses: HypothesisRepositoryPort):
        self.causes = causes
        self.hypotheses = hypotheses

    def execute(self, params: dict[str, Any]) -> dict[str, Any]:
        contract_id = normalize_contract_id(params.get("contrato_id"))
        cause_id = integer(params.get("causa_id"))
        parent_id = integer(params.get("parent_id"))
        hypothesis_id = integer(params.get("hipotesis_id"))
        hypothesis = self.hypotheses.get(hypothesis_id) if hypothesis_id else None
        if hypothesis and not cause_id:
            cause_id = int(hypothesis["causa_id"])
        cause = self.causes.get(cause_id) if cause_id else None
        if cause and not contract_id:
            contract_id = int(cause["contrato_id"])
        if parent_id and not contract_id:
            parent = self.causes.get(parent_id)
            if parent:
                contract_id = int(parent["contrato_id"])
        mode = (
            "new_root"
            if not cause_id and not parent_id and not hypothesis_id
            else "edit_hipotesis"
            if hypothesis_id
            else "edit_cause"
            if cause_id
            else "new_child"
        )
        hypotheses = self.hypotheses.list_for_cause(cause_id) if cause_id else []
        return {
            "contract_id": contract_id,
            "causa_id": cause_id,
            "parent_id": parent_id,
            "hipotesis_id": hypothesis_id,
            "mode": mode,
            "ready": bool(contract_id),
            "cause": cause,
            "hipotesis": hypothesis,
            "hypotheses": hypotheses,
            "context_items": _context_items(contract_id, cause_id, parent_id, hypothesis_id, mode, cause, hypothesis),
            "context_message": "Selecciona un contrato para continuar." if not contract_id else "Detalle listo para edicion.",
            "cause_form": _cause_form_values(cause, mode),
            "hypothesis_form": _hypothesis_form_values(hypothesis, mode),
            "labels": {
                "cause_save": "Actualizar causa" if cause_id else "Crear causa hija" if mode == "new_child" and parent_id else "Guardar causa",
                "hypothesis_save": "Actualizar hipotesis" if hypothesis_id and mode == "edit_hipotesis" else "Guardar hipotesis",
            },
        }
