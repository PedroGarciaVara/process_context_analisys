from ...ports.outbound import AnalysisRepositoryPort


class ListAnalysisTemplates:
    """List reusable causal-analysis templates for a BPM process."""

    def __init__(self, analyses: AnalysisRepositoryPort):
        self.analyses = analyses

    def execute(self, process_id: int | None = None):
        return self.analyses.list_templates(process_id)
