from __future__ import annotations

from unittest import TestCase

from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import (
    project_graph_as_tree,
    validate_delete_allowed,
    validate_relationship_signature,
    would_create_cycle,
)
from uc_bib_solv.modules.rca_tree.domain.exceptions import InvalidRelationshipError, NodeDeletionError


class GraphDomainTests(TestCase):
    def test_validate_relationship_signature_accepts_supported_combinations(self):
        parent, child, relation = validate_relationship_signature("contract", "cause", "depends_on")
        self.assertEqual((parent, child, relation), ("CONTRACT", "CAUSE", "DEPENDS_ON"))

    def test_validate_relationship_signature_rejects_invalid_combinations(self):
        with self.assertRaises(InvalidRelationshipError):
            validate_relationship_signature("machine", "cause", "causes")

    def test_would_create_cycle_detects_transitive_cycle(self):
        edges = [
            {"parent_node_id": 1, "child_node_id": 2, "relationship_type": "CAUSES"},
            {"parent_node_id": 2, "child_node_id": 3, "relationship_type": "CAUSES"},
        ]
        self.assertTrue(would_create_cycle(edges, 3, 1, relationship_type="CAUSES"))
        self.assertFalse(would_create_cycle(edges, 3, 4, relationship_type="CAUSES"))

    def test_project_graph_as_tree_marks_reused_nodes(self):
        projection = project_graph_as_tree(
            [10, 20],
            {
                10: {"id": 101, "name": "Root A", "code": "CAUSE:101"},
                20: {"id": 102, "name": "Root B", "code": "CAUSE:102"},
                30: {"id": 103, "name": "Shared", "code": "CAUSE:103"},
            },
            {
                10: [30],
                20: [30],
            },
        )
        self.assertEqual(len(projection["tree"]), 2)
        self.assertEqual(projection["tree"][0]["children"][0]["id"], 103)
        self.assertEqual(projection["reused_node_ids"], [30])

    def test_validate_delete_allowed_blocks_reused_or_referenced_nodes(self):
        with self.assertRaises(NodeDeletionError):
            validate_delete_allowed(incoming_relationships=2, outgoing_relationships=0, analysis_references=0)
        with self.assertRaises(NodeDeletionError):
            validate_delete_allowed(incoming_relationships=1, outgoing_relationships=1, analysis_references=0)
        with self.assertRaises(NodeDeletionError):
            validate_delete_allowed(incoming_relationships=1, outgoing_relationships=0, analysis_references=1)
