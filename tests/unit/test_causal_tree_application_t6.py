import unittest

from uc_bib_solv.modules.rca_tree.infrastructure.wiring import build_rca_tree_application


class FakeCause:
    def get(self, value): return {"id": value, "contrato_id": 7, "nombre": "Causa"}
    def list_for_contract(self, value): return []
    def create(self, *args, **kwargs): return {"id": 1, "nombre": args[1]}
    def update(self, *args, **kwargs): return {"id": args[0], "nombre": args[1]}
    def delete(self, value): return True


class FakeHypothesis:
    def get(self, value): return {"id": value, "causa_id": 1}
    def list_for_cause(self, value): return []
    def create(self, *args, **kwargs): return {"id": 2, "descripcion": args[1]}
    def update(self, *args, **kwargs): return {"id": args[0], "descripcion": args[1]}
    def delete(self, value): return True


class FakePersistence:
    def __init__(self): self.causes = FakeCause(); self.hypotheses = FakeHypothesis()
    def get(self, value): return self.causes.get(value)
    def list_for_contract(self, value): return []
    def create(self, *args, **kwargs): return self.causes.create(*args, **kwargs)
    def update(self, *args, **kwargs): return self.causes.update(*args, **kwargs)
    def delete(self, value): return True
    def get_hypothesis(self, value): return self.hypotheses.get(value)
    def list_for_cause(self, value): return []
    def create_hypothesis(self, *args, **kwargs): return self.hypotheses.create(*args, **kwargs)
    def update_hypothesis(self, *args, **kwargs): return self.hypotheses.update(*args, **kwargs)
    def delete_hypothesis(self, value): return True
    def tree_payload(self, *args): return {"tree": []}
    def search_reusable_nodes(self, *args, **kwargs): return []
    def list_structural_edges(self): return []


class CausalTreeApplicationT6Tests(unittest.TestCase):
    def test_fake_application_does_not_require_flask_or_postgres(self):
        service = build_rca_tree_application(persistence=FakePersistence())
        self.assertEqual(service.save_cause({"contract_id": 7, "nombre": "Nueva"})["cause"]["nombre"], "Nueva")
        self.assertEqual(service.save_hypothesis({"cause_id": 1, "descripcion": "Comprobar"})["hypothesis"]["descripcion"], "Comprobar")
