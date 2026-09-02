from typing import Any

from ...dto import integer, normalize_cause_type
from ...ports.outbound import CauseRepositoryPort
from ....domain.exceptions import CausalTreeValidationError


class UpdateCause:
    """Update the editable fields of a causal node."""

    def __init__(self, causes: CauseRepositoryPort):
        self.causes = causes

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        cause_id = integer(payload.get("causa_id"))
        if not cause_id:
            raise CausalTreeValidationError("Se requiere una causa para actualizarla.")
        # TODO Posibilidad de extraer normalizacion comun a cause_factory
        name = (payload.get("nombre") or "").strip()
        return {
            "cause": self.causes.update(
                cause_id,
                name,
                payload.get("descripcion"),
                normalize_cause_type(payload.get("tipo")),
                payload.get("categoria"),
            ),
            "message": "Causa actualizada.",
        }
