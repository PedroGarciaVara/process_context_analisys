import unittest

from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import (
    project_graph_as_tree,
    validate_delete_allowed,
    validate_relationship_signature,
    would_create_cycle,
)
from uc_bib_solv.modules.rca_tree.domain.exceptions import (
    CycleDetectedError,
    InvalidRelationshipError,
    NodeDeletionError,
)


class GraphDomainTests(unittest.TestCase):
    def test_accepts_cause_depends_on_contract(self):
        parent, child, relation = validate_relationship_signature("CAUSE", "CONTRACT", "DEPENDS_ON")
        self.assertEqual((parent, child, relation), ("CAUSE", "CONTRACT", "DEPENDS_ON"))

    def test_rejects_invalid_signature(self):
        with self.assertRaises(InvalidRelationshipError):
            validate_relationship_signature("HYPOTHESIS", "CONTRACT", "DEPENDS_ON")

    def test_invalid_types_use_the_canonical_relationship_error(self):
        with self.assertRaises(InvalidRelationshipError):
            validate_relationship_signature("UNKNOWN", "CAUSE", "CAUSES")

    def test_detects_mixed_cycle(self):
        edges = [
            {"parent_node_id": 1, "child_node_id": 2, "relationship_type": "DEPENDS_ON"},
            {"parent_node_id": 2, "child_node_id": 3, "relationship_type": "CAUSES"},
            {"parent_node_id": 3, "child_node_id": 4, "relationship_type": "DEPENDS_ON"},
        ]
        self.assertTrue(would_create_cycle(edges, 4, 1, relationship_type="DEPENDS_ON"))

    def test_validate_no_cycle_uses_the_canonical_cycle_error(self):
        from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import validate_no_cycle

        with self.assertRaises(CycleDetectedError):
            validate_no_cycle(
                [{"parent_node_id": 1, "child_node_id": 2, "relationship_type": "CAUSES"}],
                2,
                1,
            )

    def test_projection_marks_reused_nodes(self):
        nodes_by_id = {
            1: {"id": 1, "node_id": 1, "name": "A", "code": "A"},
            2: {"id": 2, "node_id": 2, "name": "B", "code": "B"},
            3: {"id": 3, "node_id": 3, "name": "C", "code": "C"},
        }
        child_ids_by_parent = {
            1: [2, 3],
            2: [3],
        }
        projection = project_graph_as_tree([1], nodes_by_id, child_ids_by_parent)
        self.assertIn(3, projection["reused_node_ids"])

    def test_projection_has_stable_order_and_graph_parent_metadata(self):
        projection = project_graph_as_tree(
            [1],
            {
                1: {"id": 101, "node_id": 1, "name": "Root", "code": "R"},
                2: {"id": 102, "node_id": 2, "name": "Zulu", "code": "Z"},
                3: {"id": 103, "node_id": 3, "name": "Alpha", "code": "A"},
            },
            {1: [2, 3]},
        )
        root = projection["tree"][0]
        first, second = root["children"]
        self.assertEqual([first["id"], second["id"]], [103, 102])
        self.assertIsNone(root["parent_node_id"])
        self.assertEqual(first["parent_node_id"], 1)

    def test_validate_delete_allowed_uses_the_canonical_deletion_error(self):
        with self.assertRaises(NodeDeletionError):
            validate_delete_allowed(incoming_relationships=2, outgoing_relationships=0, analysis_references=0)


if __name__ == "__main__":
    unittest.main()
