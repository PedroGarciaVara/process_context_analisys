from __future__ import annotations

from .use_cases import RcaTreeUseCases


class RcaTreeService:
    def __init__(self, use_cases: RcaTreeUseCases):
        self.use_cases = use_cases

    def get_tree_payload(self, view="arbol", selected_cause_id=None, zoom=1.0, contract_id=None):
        view = view if view in {"arbol", "analisis_causas_v2"} else "arbol"
        payload = self.use_cases.tree(view, selected_cause_id, zoom, contract_id)
        payload["status"] = "ok"
        return payload

    def get_detail_payload(self, params): return self.use_cases.detail(dict(params))
    def save_cause(self, payload): return self.use_cases.save_cause(payload)
    def save_hypothesis(self, payload): return self.use_cases.save_hypothesis(payload)
    def list_hypotheses(self, cause_id): return {"causa_id": int(cause_id), "hypotheses": self.use_cases.hypotheses.list_for_cause(int(cause_id))}

    def delete_cause(self, cause_id):
        if not self.use_cases.causes.delete(int(cause_id)):
            raise ValueError("Causa no encontrada.")
        return {"deleted": True, "message": "Causa eliminada."}

    def delete_hypothesis(self, hypothesis_id):
        if not self.use_cases.hypotheses.delete(int(hypothesis_id)):
            raise ValueError("Hipotesis no encontrada.")
        return {"deleted": True, "message": "Hipotesis eliminada."}

    def get_delete_preview(self, hypothesis_id):
        hypothesis = self.use_cases.hypotheses.get(int(hypothesis_id))
        if not hypothesis:
            raise ValueError("Hipotesis no encontrada.")
        cause = self.use_cases.causes.get(int(hypothesis["causa_id"]))
        return {"hipotesis_id": int(hypothesis["id"]), "causa_id": int(hypothesis["causa_id"]), "title": "Confirmar eliminacion de hipotesis", "message": f"Vas a eliminar '{hypothesis.get('descripcion') or 'Hipotesis sin descripcion'}'.", "detail": f"Causa vinculada: {cause.get('nombre', 'Causa desconocida') if cause else 'Causa desconocida'} | Estado actual: {hypothesis.get('estado') or 'pendiente'}", "confirm_label": "Eliminar", "cancel_label": "Cancelar", "tone": "danger"}

    def search_reusable_nodes(self, params):
        node_type = (params.get("node_type") or "CAUSE").strip()
        text = (params.get("text") or "").strip() or None
        limit = max(1, min(int(params.get("limit") or 25), 100))
        items = self.use_cases.queries.search_reusable_nodes(node_type, text=text, limit=limit)
        return {"node_type": node_type.upper(), "items": items, "count": len(items)}

    def link_reusable_node(self, payload):
        child_node_id = payload.get("child_node_id")
        if not child_node_id:
            raise ValueError("Selecciona un nodo reutilizable antes de vincular.")
        result = self.use_cases.queries.link_reusable_node(child_node_id=int(child_node_id), contract_id=payload.get("contract_id"), parent_id=payload.get("parent_id"))
        result["message"] = "Nodo existente vinculado."
        return result

    def create_contract_node(self, payload):
        contract_id = payload.get("contract_id")
        name = (payload.get("nombre") or "").strip()
        if not contract_id or not name:
            raise ValueError("Se requiere un contrato activo y un nombre para crear un contrato hijo.")
        result = self.use_cases.queries.create_contract_child(int(contract_id), name, objetivo=(payload.get("descripcion") or "").strip() or None, metrica=(payload.get("categoria") or "").strip() or None)
        result["message"] = "Contrato creado y vinculado."
        return result

