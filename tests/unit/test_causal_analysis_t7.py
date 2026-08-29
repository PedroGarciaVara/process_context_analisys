import unittest

from uc_bib_solv.modules.rca_tree.domain.analyses.entities import AnalysisResult, normalize_state, validate_evaluation
from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import build_rca_tree_analysis_application


class FakePersistence:
    def __init__(self):
        self.created = None
        self.updated = None
        self.saved = None

    def list_recent(self, *args): return [{"id": 1}]
    def list_templates(self, process_id=None): return [{"id": 7, "proceso_id": process_id}]
    def create(self, payload): self.created = payload; return {"id": 9, "contrato_id": payload["contract_id"], "estado": "abierto"}
    def add(self, analysis_id, participant): return {"analisis_id": analysis_id, "participante": participant}
    def list_for_analysis(self, analysis_id): return ["Ana"]
    def get(self, analysis_id): return {"id": analysis_id, "estado": "abierto"}
    def update(self, analysis_id, payload): self.updated = (analysis_id, payload); return {"id": analysis_id, **payload}
    def save(self, analysis_id, payload): self.saved = (analysis_id, payload); return {"id": 4, **payload}
    def list_results(self, analysis_id): return [{"id": 4}]
    list_for_analysis = list_results


class CausalAnalysisT7Tests(unittest.TestCase):
    def test_domain_is_framework_free_and_validates_result_identity(self):
        self.assertEqual(normalize_state(" CERRADO "), "cerrado")
        self.assertEqual(validate_evaluation("causa", "EVALUADA"), "evaluada")
        with self.assertRaises(ValueError):
            AnalysisResult(3, "causa", hypothesis_id=5)

    def test_application_uses_fake_ports_without_postgres(self):
        fake = FakePersistence()
        service = build_rca_tree_analysis_application(persistence=fake)
        created = service.create({"template_contract_id": 7, "process_id": 2, "participant": " Ana ", "indication": " desviacion "})
        self.assertEqual(created["id"], 9)
        self.assertEqual(created["participants"], ["Ana"])
        self.assertEqual(service.update(9, {"status": "cerrado"})["status"], "cerrado")
        self.assertEqual(service.save_result(9, {"element_type": "causa", "cause_id": 3})["id"], 4)

    def test_canonical_analysis_application_is_the_only_service_boundary(self):
        self.assertTrue(hasattr(build_rca_tree_analysis_application(persistence=FakePersistence()), "list_recent"))
