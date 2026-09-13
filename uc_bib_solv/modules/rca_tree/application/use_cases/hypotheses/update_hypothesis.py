from typing import Any

from ...dto import integer
from ...ports.outbound import HypothesisRepositoryPort
from ....domain.exceptions import CausalTreeValidationError
from .create_hypothesis import _scientific_fields


class UpdateHypothesis:
    """Update a hypothesis and its lifecycle fields."""

    def __init__(self, hypotheses: HypothesisRepositoryPort):
        self.hypotheses = hypotheses

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        hypothesis_id = integer(payload.get("hypothesis_id"))
        if not hypothesis_id:
            raise CausalTreeValidationError("Se requiere una hipotesis para actualizarla.")
        # TODO Posibilidad de extraer normalizacion comun a hypothesis_factory
        description = (payload.get("descripcion") or "").strip()
        title = (payload.get("nombre") or payload.get("titulo") or payload.get("title") or description).strip()
        # None is deliberate: the template does not edit lifecycle/type fields,
        # so repository implementations must preserve their current values.
        status = payload.get("estado") if "estado" in payload else None
        kind = payload.get("tipo") if "tipo" in payload else None
        criterion = payload.get("criterio_validacion")
        saved = self.hypotheses.update(
            hypothesis_id,
            description,
            kind,
            criterion,
            status,
            title=title,
            **_scientific_fields(payload, status, criterion),
        )
        return {"hypothesis": saved, "message": "Hipotesis actualizada."}
