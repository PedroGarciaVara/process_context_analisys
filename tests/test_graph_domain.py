import unittest

from app.domain.graph import (
    GraphDomainError,
    project_graph_as_tree,
    validate_relationship_signature,
    would_create_cycle,
)


class GraphDomainTests(unittest.TestCase):
    def test_accepts_cause_depends_on_contract(self):
        parent, child, relation = validate_relationship_signature("CAUSE", "CONTRACT", "DEPENDS_ON")
        self.assertEqual((parent, child, relation), ("CAUSE", "CONTRACT", "DEPENDS_ON"))

    def test_rejects_invalid_signature(self):
        with self.assertRaises(GraphDomainError):
            validate_relationship_signature("HYPOTHESIS", "CONTRACT", "DEPENDS_ON")

    def test_detects_mixed_cycle(self):
        edges = [
            {"parent_node_id": 1, "child_node_id": 2, "relationship_type": "DEPENDS_ON"},
            {"parent_node_id": 2, "child_node_id": 3, "relationship_type": "CAUSES"},
            {"parent_node_id": 3, "child_node_id": 4, "relationship_type": "DEPENDS_ON"},
        ]
        self.assertTrue(would_create_cycle(edges, 4, 1, relationship_type="DEPENDS_ON"))

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


if __name__ == "__main__":
    unittest.main()
