from ...ports.outbound import AnalysisRepositoryPort, ParticipantRepositoryPort, ResultRepositoryPort


class GetAnalysis:
    """Get one analysis with participants and results."""

    def __init__(
        self,
        analyses: AnalysisRepositoryPort,
        participants: ParticipantRepositoryPort,
        results: ResultRepositoryPort,
    ):
        self.analyses = analyses
        self.participants = participants
        self.results = results

    def execute(self, analysis_id: int):
        analysis = self.analyses.get(int(analysis_id))
        if analysis is not None:
            analysis.setdefault("participants", self.participants.list_for_analysis(int(analysis_id)))
            analysis.setdefault("results", self.results.list_for_analysis(int(analysis_id)))
        return analysis
