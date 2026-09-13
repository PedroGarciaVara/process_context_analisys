from typing import Any

from ...dto import integer
from ...ports.outbound import HypothesisRepositoryPort
from ....domain.exceptions import CausalTreeValidationError
from ....domain.analyses.entities import validate_scientific_decision

_SCIENTIFIC_ALIASES = {
    "prediction": "prediction", "metric": "metric", "unit": "unit",
    "data_source": "data_source", "method": "method", "period": "period",
    "calculation": "calculation", "threshold": "threshold", "evidence": "evidence",
    "prediccion": "prediction", "metrica": "metric", "unidad": "unit",
    "fuente": "data_source", "fuente_datos": "data_source", "metodo": "method",
    "periodo": "period", "calculo": "calculation", "umbral": "threshold",
    "evidencia": "evidence", "decision": "decision",
    "justificacion": "decision_justification", "justificacion_decision": "decision_justification",
    "accion_control": "control_action", "responsable": "action_owner",
    "responsable_accion": "action_owner", "fecha_control": "control_date",
}


def _scientific_fields(payload: dict[str, Any], status: str | None, criterion: Any) -> dict[str, Any]:
    fields = {target: payload[source] for source, target in _SCIENTIFIC_ALIASES.items() if source in payload}
    validate_scientific_decision(payload.get("decision") or status or "pendiente", evidence=fields.get("evidence"), criterion=criterion,
                                 justification=fields.get("decision_justification"))
    return fields


class CreateHypothesis:
    """Create a hypothesis for a causal node."""

    def __init__(self, hypotheses: HypothesisRepositoryPort):
        self.hypotheses = hypotheses

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        cause_id = integer(payload.get("cause_id"))
        if not cause_id:
            raise CausalTreeValidationError("Se requiere una causa para crear una hipotesis.")
        # TODO Posibilidad de extraer normalizacion comun a hypothesis_factory
        description = (payload.get("descripcion") or "").strip()
        title = (payload.get("nombre") or payload.get("titulo") or payload.get("title") or description).strip()
        status = payload.get("estado") or "pendiente"
        criterion = payload.get("criterio_validacion")
        saved = self.hypotheses.create(
            cause_id,
            description,
            payload.get("tipo") or "aceptacion",
            criterion,
            status,
            title=title,
            **_scientific_fields(payload, status, criterion),
        )
        return {"hypothesis": saved, "message": "Hipotesis creada."}
