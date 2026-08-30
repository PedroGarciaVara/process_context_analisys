from typing import Any

from ....domain.analyses.entities import normalize_state, validate_transition
from ....domain.exceptions import CausalTreeStateError
from ...ports.outbound import AnalysisRepositoryPort


class UpdateAnalysis:
    """Update an analysis while enforcing its lifecycle transition."""

    def __init__(self, analyses: AnalysisRepositoryPort, get_analysis: object):
        self.analyses = analyses
        self.get_analysis = get_analysis

    def execute(self, analysis_id: int, payload: dict[str, Any]):
        current = self.get_analysis.execute(int(analysis_id))
        if current is None:
            raise CausalTreeStateError("Análisis no encontrado.")
        requested_status = payload.get("status")
        content_changes = any(key != "status" for key in payload)
        if current.get("estado") == "cerrado" and content_changes and requested_status != "abierto":
            raise CausalTreeStateError("El análisis cerrado es de solo lectura; reábrelo para editarlo.")
        if requested_status is not None:
            validate_transition(current.get("estado", "abierto"), payload["status"]) if current else normalize_state(payload["status"])
        return self.analyses.update(int(analysis_id), payload)
