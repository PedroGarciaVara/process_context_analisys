from ..adapters.outbound.analysis_postgres import RcaTreeAnalysisPostgresAdapter
from ..adapters.outbound.transaction_postgres import PostgresTransactionAdapter
from ..application.analysis_use_cases import AnalysisUseCases


class RcaTreeAnalysisService:
    def __init__(self, use_cases): self.use_cases = use_cases
    def list_recent(self, *args): return self.use_cases.list_recent(*args)
    def list_templates(self, *args): return self.use_cases.list_templates(*args)
    def create(self, payload): return self.use_cases.create(payload)
    def get(self, analysis_id): return self.use_cases.get(analysis_id)
    def update(self, analysis_id, payload): return self.use_cases.update(analysis_id, payload)
    def save_result(self, analysis_id, payload): return self.use_cases.save_result(analysis_id, payload)


def build_rca_tree_analysis_persistence():
    return RcaTreeAnalysisPostgresAdapter(PostgresTransactionAdapter())


def build_rca_tree_analysis_service(*, persistence=None):
    persistence = persistence or build_rca_tree_analysis_persistence()
    return RcaTreeAnalysisService(AnalysisUseCases(
        persistence,
        ParticipantAdapter(persistence),
        ResultAdapter(persistence),
    ))


build_causal_analysis_service = build_rca_tree_analysis_service


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
