from __future__ import annotations

from typing import Any

from uc_bib_solv.modules.platform.application.ports import ContractRef

from .ports import BpmContextPort, CausePort, HypothesisPort, NodePort, RelationshipPort, TreeQueryPort
from ..domain.causal_graph.operations import ensure_acyclic


class RcaTreeUseCases:
    """Use cases for the causal graph, independent from HTTP and persistence."""

    def __init__(self, causes: CausePort, hypotheses: HypothesisPort, nodes: NodePort, relationships: RelationshipPort, queries: TreeQueryPort, bpm_context: BpmContextPort | None = None):
        self.causes = causes
        self.hypotheses = hypotheses
        self.nodes = nodes
        self.relationships = relationships
        self.queries = queries
        self.bpm_context = bpm_context

    def tree(self, view="arbol", selected_cause_id=None, zoom=1.0, contract_id=None):
        return self.queries.tree_payload(view, selected_cause_id, zoom, _legacy_contract_id(contract_id))

    def detail(self, params: dict[str, Any]) -> dict[str, Any]:
        contract_id = _legacy_contract_id(params.get("contrato_id"))
        cause_id = _integer(params.get("causa_id"))
        parent_id = _integer(params.get("parent_id"))
        hypothesis_id = _integer(params.get("hipotesis_id"))
        hypothesis = self.hypotheses.get(hypothesis_id) if hypothesis_id else None
        if hypothesis and not cause_id:
            cause_id = int(hypothesis["causa_id"])
        cause = self.causes.get(cause_id) if cause_id else None
        if cause and not contract_id:
            contract_id = int(cause["contrato_id"])
        mode = "new_root" if not cause_id and not parent_id and not hypothesis_id else ("edit_hipotesis" if hypothesis_id else ("edit_cause" if cause_id else "new_child"))
        hypotheses = self.hypotheses.list_for_cause(cause_id) if cause_id else []
        return {"contract_id": contract_id, "causa_id": cause_id, "parent_id": parent_id, "hipotesis_id": hypothesis_id, "mode": mode, "ready": bool(contract_id), "cause": cause, "hipotesis": hypothesis, "hypotheses": hypotheses}

    def save_cause(self, payload: dict[str, Any]) -> dict[str, Any]:
        contract_id, cause_id, parent_id = (_integer(payload.get(key)) for key in ("contract_id", "causa_id", "parent_id"))
        name = (payload.get("nombre") or "").strip()
        cause_type = _normalize_cause_type(payload.get("tipo"))
        if not contract_id and not cause_id:
            raise ValueError("Se requiere un contrato para crear o actualizar una causa.")
        if cause_id:
            return {"cause": self.causes.update(cause_id, name, payload.get("descripcion"), cause_type, payload.get("categoria")), "message": "Causa actualizada."}
        return {"cause": self.causes.create(contract_id, name, payload.get("descripcion"), cause_type, payload.get("categoria"), parent_id), "message": "Causa creada."}

    def save_hypothesis(self, payload: dict[str, Any]) -> dict[str, Any]:
        cause_id, hypothesis_id = _integer(payload.get("cause_id")), _integer(payload.get("hypothesis_id"))
        description = (payload.get("descripcion") or "").strip()
        if not cause_id and not hypothesis_id:
            raise ValueError("Se requiere una causa para crear o actualizar una hipotesis.")
        args = (description, payload.get("tipo") or "aceptacion", payload.get("criterio_validacion"), payload.get("estado") or "pendiente")
        saved = self.hypotheses.update(hypothesis_id, *args) if hypothesis_id else self.hypotheses.create(cause_id, *args)
        return {"hypothesis": saved, "message": "Hipotesis actualizada." if hypothesis_id else "Hipotesis creada."}


def _integer(value):
    if value in (None, "", "null", []):
        return None
    return int(value)


def _legacy_contract_id(value):
    if value in (None, "", "null", []):
        return None
    return ContractRef.from_value(value).as_legacy_int()


def _normalize_cause_type(value):
    normalized = {"cause": "causa", "effect": "efecto"}.get(str(value or "causa").strip().lower(), str(value or "causa").strip().lower())
    if normalized not in {"causa", "efecto"}:
        raise ValueError("El tipo de causa debe ser causa o efecto.")
    return normalized


# Temporary Python compatibility name while consumers migrate to RCA_TREE.
CausalTreeUseCases = RcaTreeUseCases
