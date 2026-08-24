from typing import Any

from ...dto import integer
from ...ports.outbound import HypothesisRepositoryPort


class UpdateHypothesis:
    """Update a hypothesis and its lifecycle fields."""

    def __init__(self, hypotheses: HypothesisRepositoryPort):
        self.hypotheses = hypotheses

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        hypothesis_id = integer(payload.get("hypothesis_id"))
        if not hypothesis_id:
            raise ValueError("Se requiere una hipotesis para actualizarla.")
        description = (payload.get("descripcion") or "").strip()
        saved = self.hypotheses.update(
            hypothesis_id,
            description,
            payload.get("tipo") or "aceptacion",
            payload.get("criterio_validacion"),
            payload.get("estado") or "pendiente",
        )
        return {"hypothesis": saved, "message": "Hipotesis actualizada."}
