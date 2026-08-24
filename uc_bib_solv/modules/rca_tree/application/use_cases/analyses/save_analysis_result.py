from typing import Any

from ....domain.analyses.entities import AnalysisResult, normalize_result_type
from ...ports.outbound import ResultRepositoryPort


class SaveAnalysisResult:
    """Validate and persist one result attached to an analysis."""

    def __init__(self, results: ResultRepositoryPort):
        self.results = results

    def execute(self, analysis_id: int, payload: dict[str, Any]):
        result_type = normalize_result_type(payload.get("element_type"))
        AnalysisResult(
            int(analysis_id),
            result_type,
            payload.get("cause_id") if result_type == "causa" else None,
            payload.get("hypothesis_id") if result_type == "hipotesis" else None,
            payload.get("evidence"),
            payload.get("conclusion"),
            payload.get("evaluation") or "pendiente",
        )
        return self.results.save(int(analysis_id), {**payload, "element_type": result_type})
