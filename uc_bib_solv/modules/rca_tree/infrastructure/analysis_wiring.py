from ..adapters.outbound.analysis_postgres import RcaTreeAnalysisPostgresAdapter
from ..adapters.outbound.transaction_postgres import PostgresTransactionAdapter
from ..application.use_cases import (
    CreateAnalysis,
    GetAnalysis,
    ListAnalyses,
    ListAnalysisTemplates,
    SaveAnalysisResult,
    UpdateAnalysis,
)
from .analysis_application import RcaTreeAnalysisApplication


def build_rca_tree_analysis_persistence():
    return RcaTreeAnalysisPostgresAdapter(PostgresTransactionAdapter())


def build_rca_tree_analysis_application(*, persistence=None):
    persistence = persistence or build_rca_tree_analysis_persistence()
    participants = ParticipantAdapter(persistence)
    results = ResultAdapter(persistence)
    get_analysis = GetAnalysis(persistence, participants, results)
    return RcaTreeAnalysisApplication(
        list_analyses=ListAnalyses(persistence),
        list_templates=ListAnalysisTemplates(persistence),
        create_analysis=CreateAnalysis(persistence, participants),
        get_analysis=get_analysis,
        update_analysis=UpdateAnalysis(persistence, get_analysis),
        save_result=SaveAnalysisResult(results),
    )


class ParticipantAdapter:
    def __init__(self, persistence): self.persistence = persistence
    def list_for_analysis(self, analysis_id):
        loader = getattr(self.persistence, "list_participants", None) or getattr(self.persistence, "list_for_analysis")
        return loader(analysis_id)
    def add(self, analysis_id, participant): return self.persistence.add(analysis_id, participant)


class ResultAdapter:
    def __init__(self, persistence): self.persistence = persistence
    def list_for_analysis(self, analysis_id): return self.persistence.list_results(analysis_id)
    def save(self, analysis_id, payload): return self.persistence.save(analysis_id, payload)
