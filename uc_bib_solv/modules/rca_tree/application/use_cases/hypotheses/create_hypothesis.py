from typing import Any

from ...dto import integer
from ...ports.outbound import HypothesisRepositoryPort


class CreateHypothesis:
    """Create a hypothesis for a causal node."""

    def __init__(self, hypotheses: HypothesisRepositoryPort):
        self.hypotheses = hypotheses

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        cause_id = integer(payload.get("cause_id"))
        if not cause_id:
            raise ValueError("Se requiere una causa para crear una hipotesis.")
        description = (payload.get("descripcion") or "").strip()
        saved = self.hypotheses.create(
            cause_id,
            description,
            payload.get("tipo") or "aceptacion",
            payload.get("criterio_validacion"),
            payload.get("estado") or "pendiente",
        )
        return {"hypothesis": saved, "message": "Hipotesis creada."}
