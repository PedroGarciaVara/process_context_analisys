import unittest

from uc_bib_solv.modules.rca_tree.application.use_cases.analyses import (
    CreateAnalysis,
    GetAnalysis,
    SaveAnalysisResult,
    UpdateAnalysis,
)


class FakeAnalysisPersistence:
    def __init__(self): self.items = {}
    def list_recent(self, *args): return list(self.items.values())
    def list_templates(self, process_id=None): return []
    def create(self, payload):
        value = {"id": 1, **payload}; self.items[1] = value; return value
    def get(self, analysis_id): return self.items.get(int(analysis_id))
    def update(self, analysis_id, payload): self.items[int(analysis_id)].update(payload); return self.items[int(analysis_id)]
    def add(self, analysis_id, participant): return {"participante": participant}
    def list_participants(self, analysis_id): return ["Ana"]
    def list_for_analysis(self, analysis_id): return self.list_participants(analysis_id)
    def save(self, analysis_id, payload): return {"analisis_id": analysis_id, **payload}
    def list_results(self, analysis_id): return []


class FakeTransaction:
    def cursor(self):
        raise AssertionError("El doble de análisis no debe abrir PostgreSQL")


class RcaTreeAnalysisPortsTests(unittest.TestCase):
    def setUp(self):
        self.persistence = FakeAnalysisPersistence()
        self.get_analysis = GetAnalysis(self.persistence, self.persistence, self.persistence)
        self.create_analysis = CreateAnalysis(self.persistence, self.persistence)
        self.update_analysis = UpdateAnalysis(self.persistence, self.get_analysis)
        self.save_result = SaveAnalysisResult(self.persistence)

    def test_create_works_without_postgres(self):
        result = self.create_analysis.execute({"contract_id": 4, "process_id": 2, "indication": "Apertura"})
        self.assertEqual(1, result["id"])
        self.assertEqual(["Usuario"], result["participants"])

    def test_update_and_result_use_explicit_ports(self):
        self.create_analysis.execute({"contract_id": 4, "process_id": 2, "indication": "Apertura"})
        self.assertEqual("cerrado", self.update_analysis.execute(1, {"status": "cerrado"})["status"])
        result = self.save_result.execute(1, {"element_type": "causa", "cause_id": 3})
        self.assertEqual(3, result["cause_id"])

    def test_transaction_port_is_separate_from_analysis_persistence(self):
        from uc_bib_solv.modules.rca_tree.adapters.outbound.analysis_postgres import RcaTreeAnalysisPostgresAdapter

        adapter = RcaTreeAnalysisPostgresAdapter(FakeTransaction())
        self.assertIsInstance(adapter.transaction, FakeTransaction)


if __name__ == "__main__":
    unittest.main()
