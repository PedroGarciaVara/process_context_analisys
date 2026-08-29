import unittest

from uc_bib_solv.modules.rca_tree.domain.causal_graph.entities import Relationship
from uc_bib_solv.modules.rca_tree.domain.exceptions import CycleDetectedError, InvalidRelationshipError
from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import validate_no_cycle, project_graph_as_tree
from uc_bib_solv.modules.rca_tree.domain.causes.tags import normalize_tags


class CausalTreeDomainT6Tests(unittest.TestCase):
    def test_relationship_signature_is_domain_only(self):
        Relationship.validate_signature("CAUSE", "CAUSES", "CAUSE")
        with self.assertRaises(InvalidRelationshipError):
            Relationship.validate_signature("HYPOTHESIS", "CAUSES", "CAUSE")

    def test_cycle_rule_is_framework_free(self):
        edges = [{"parent_node_id": 1, "child_node_id": 2, "relationship_type": "CAUSES"}]
        with self.assertRaises(CycleDetectedError):
            validate_no_cycle(edges, 2, 1)

    def test_projection_is_deterministic_and_marks_reuse(self):
        result = project_graph_as_tree([1, 2], {1: {"id": 1, "name": "A"}, 2: {"id": 2, "name": "B"}, 3: {"id": 3, "name": "C"}}, {1: [3], 2: [3]})
        self.assertEqual(result["reused_node_ids"], [3])

    def test_tags_are_normalized_and_deduplicated(self):
        self.assertEqual(normalize_tags([" Medida ", "medida", "desconocida"]), ["medida"])
