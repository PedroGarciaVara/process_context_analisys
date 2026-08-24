from typing import Any

from ....domain.analyses.entities import normalize_state, validate_transition
from ...ports.outbound import AnalysisRepositoryPort


class UpdateAnalysis:
    """Update an analysis while enforcing its lifecycle transition."""

    def __init__(self, analyses: AnalysisRepositoryPort, get_analysis: object):
        self.analyses = analyses
        self.get_analysis = get_analysis

    def execute(self, analysis_id: int, payload: dict[str, Any]):
        if payload.get("status") is not None:
            current = self.get_analysis.execute(int(analysis_id))
            validate_transition(current.get("estado", "abierto"), payload["status"]) if current else normalize_state(payload["status"])
        return self.analyses.update(int(analysis_id), payload)
