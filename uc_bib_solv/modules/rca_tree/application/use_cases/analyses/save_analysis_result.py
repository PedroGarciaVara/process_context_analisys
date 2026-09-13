from typing import Any

from ....domain.analyses.entities import AnalysisResult, normalize_result_type
from ....domain.exceptions import CausalTreeStateError
from ...ports.outbound import ResultRepositoryPort


class SaveAnalysisResult:
    """Validate and persist one result attached to an analysis."""

    def __init__(self, results: ResultRepositoryPort):
        self.results = results

    def _analysis_is_closed(self, analysis_id: int) -> bool:
        getter = getattr(self.results, "get", None)
        analysis = getter(analysis_id) if callable(getter) else None
        return bool(analysis and (analysis.get("estado") or analysis.get("status")) == "cerrado")

    def execute(self, analysis_id: int, payload: dict[str, Any]):
        result_type = normalize_result_type(payload.get("element_type"))
        if self._analysis_is_closed(int(analysis_id)):
            raise CausalTreeStateError("El análisis cerrado es de solo lectura; reábrelo para editarlo.")
        criterion = payload.get("validation_criterion", payload.get("criterio_validacion"))
        justification = payload.get("decision_justification", payload.get("justificacion_decision", payload.get("justificacion")))
        scientific = {
            "validation_criterion": criterion,
            "decision_justification": justification,
            "prediction": payload.get("prediction", payload.get("prediccion")),
            "metric": payload.get("metric", payload.get("metrica")),
            "unit": payload.get("unit", payload.get("unidad")),
            "data_source": payload.get("data_source", payload.get("fuente_datos", payload.get("fuente"))),
            "method": payload.get("method", payload.get("metodo")),
            "period": payload.get("period", payload.get("periodo")),
            "calculation": payload.get("calculation", payload.get("calculo")),
            "threshold": payload.get("threshold", payload.get("umbral")),
            "decision": payload.get("decision"),
            "control_action": payload.get("control_action", payload.get("accion_control")),
            "action_owner": payload.get("action_owner", payload.get("responsable_accion", payload.get("responsable"))),
            "control_date": payload.get("control_date", payload.get("fecha_control")),
        }
        evaluation = payload.get("evaluation") or payload.get("decision") or "pendiente"
        AnalysisResult(
            int(analysis_id),
            result_type,
            payload.get("cause_id") if result_type == "causa" else None,
            payload.get("hypothesis_id") if result_type == "hipotesis" else None,
            payload.get("evidence", payload.get("evidencia")),
            payload.get("conclusion"),
            evaluation,
            **scientific,
        )
        return self.results.save(int(analysis_id), {**payload, **scientific, "element_type": result_type, "evaluation": evaluation})
