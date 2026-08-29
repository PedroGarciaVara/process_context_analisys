import unittest

from uc_bib_solv.modules.rca_tree.adapters.outbound.tree_persistence import RcaTreePostgresAdapter
from uc_bib_solv.modules.rca_tree.infrastructure.wiring import build_causal_tree_service


class CausalTreeBoundaryTests(unittest.TestCase):
    def test_canonical_tree_adapter_composes_injected_repositories(self):
        adapter = RcaTreePostgresAdapter("causes", "hypotheses", "nodes", "relationships", "queries", contract_context="bpm")
        self.assertEqual("causes", adapter.cause_repo)
        self.assertEqual("hypotheses", adapter.hypothesis_repo)
        self.assertEqual("nodes", adapter.node_repo)
        self.assertEqual("relationships", adapter.relationship_repo)
        self.assertEqual("queries", adapter.tree_repo)

    def test_tree_wiring_accepts_fake_persistence(self):
        fake = type("Persistence", (), {
            "get_by_legacy_ref": lambda self, *args: None,
            "get": lambda self, *args: None,
            "get_hypothesis": lambda self, *args: None,
            "list_for_cause": lambda self, *args: [],
            "tree_payload": lambda self, *args: {},
        })()
        service = build_causal_tree_service(persistence=fake)
        self.assertIsNotNone(service)


if __name__ == "__main__":
    unittest.main()
