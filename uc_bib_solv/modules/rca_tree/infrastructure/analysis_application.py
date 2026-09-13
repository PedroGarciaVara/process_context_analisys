"""Composition of causal-analysis use cases."""

from ..application.use_cases import (
    CreateAnalysis,
    GetAnalysis,
    ListAnalyses,
    ListAnalysisTemplates,
    SaveAnalysisResult,
    UpdateAnalysis,
)


class RcaTreeAnalysisApplication:
    def __init__(
        self,
        *,
        list_analyses: ListAnalyses,
        list_templates: ListAnalysisTemplates,
        create_analysis: CreateAnalysis,
        get_analysis: GetAnalysis,
        update_analysis: UpdateAnalysis,
        save_result: SaveAnalysisResult,
    ):
        self._list_analyses = list_analyses
        self._list_templates = list_templates
        self._create_analysis = create_analysis
        self._get_analysis = get_analysis
        self._update_analysis = update_analysis
        self._save_result = save_result

    def list_recent(self, limit=20, status=None, search=None):
        return self._list_analyses.execute(limit, status, search)

    def list_templates(self, process_id=None):
        return self._list_templates.execute(process_id)

    def create(self, payload):
        return self._create_analysis.execute(payload)

    def get(self, analysis_id):
        return self._get_analysis.execute(analysis_id)

    def update(self, analysis_id, payload):
        return self._update_analysis.execute(analysis_id, payload)

    def save_result(self, analysis_id, payload):
        result = self._save_result.execute(analysis_id, payload)
        if isinstance(result, dict):
            aliases = {
                "decision": "decision",
                "justificacion_decision": "decision_justification",
                "accion_control": "control_action",
                "responsable_accion": "action_owner",
                "fecha_control": "control_date",
            }
            for source, target in aliases.items():
                if source in result and target not in result:
                    result[target] = result[source]
        return result


__all__ = ["RcaTreeAnalysisApplication"]
