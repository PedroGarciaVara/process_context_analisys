from ...ports.outbound import AnalysisRepositoryPort


class ListAnalyses:
    """List recent RCA analyses using the requested filters."""

    def __init__(self, analyses: AnalysisRepositoryPort):
        self.analyses = analyses

    def execute(self, limit: int = 20, status: str | None = None, search: str | None = None):
        return self.analyses.list_recent(limit, status, search)
