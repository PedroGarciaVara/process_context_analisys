from __future__ import annotations

from contextlib import nullcontext
from pathlib import Path
import sys
from unittest import TestCase
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import graph_query_repo


class _FakeCursor:
    def __init__(self, rows):
        self._rows = rows
        self.executed: list[tuple[str, tuple[int, int]]] = []

    def execute(self, sql, params):
        self.executed.append((sql, params))

    def fetchall(self):
        return self._rows


class GraphQueryRepoTests(TestCase):
    def test_projection_serializes_hypothesis_as_cause_child(self):
        rows = [
            {
                "parent_node_id": 100, "child_node_id": 301, "relationship_type": "CAUSES",
                "parent_node_type": "CONTRACT", "node_type": "CAUSE", "child_node_type": "CAUSE",
                "code": "CAUSE:301", "name": "Causa", "description": "desc", "status": "active",
                "child_cause_id": 501, "parent_contract_id": 42, "metadata": {},
            },
            {
                "parent_node_id": 301, "child_node_id": 302, "relationship_type": "HAS_HYPOTHESIS",
                "parent_node_type": "CAUSE", "node_type": "HYPOTHESIS", "child_node_type": "HYPOTHESIS",
                "code": "HYPOTHESIS:302", "name": "Hipótesis", "description": "legacy",
                "status": "pendiente", "child_hypothesis_id": 601, "child_hypothesis_cause_id": 501,
                "child_hypothesis_description": "Hipótesis inicial", "child_hypothesis_type": "aceptacion",
                "child_hypothesis_validation_criterion": "Criterio", "child_hypothesis_status": "pendiente",
                "parent_cause_id": 501, "metadata": {},
            },
        ]
        cursor = _FakeCursor(rows)
        with (
            patch("uc_bib_solv.modules.rca_tree.adapters.outbound.postgres.graph_query_repo._contract_node", return_value={"id": 100}),
            patch("uc_bib_solv.modules.rca_tree.adapters.outbound.postgres.graph_query_repo.db_cursor", return_value=nullcontext(cursor)),
        ):
            projected = graph_query_repo.get_projected_causes_for_contract(42)

        hypothesis = projected["tree"][0]["children"][0]
        self.assertEqual(hypothesis["id"], 601)
        self.assertEqual(hypothesis["node_type"], "HYPOTHESIS")
        self.assertEqual(hypothesis["parent_id"], 501)
        self.assertEqual(hypothesis["nombre"], "Hipótesis inicial")

    def test_get_projected_causes_for_contract_includes_child_contract_causes(self):
        rows = [
            {
                "parent_node_id": 200,
                "child_node_id": 301,
                "relationship_type": "DEPENDS_ON",
                "parent_node_type": "CONTRACT",
                "child_node_type": "CAUSE",
                "node_id": 301,
                "code": "CAUSE:301",
                "name": "Causa raiz hija",
                "description": "desc root",
                "status": "active",
                "child_cause_id": 501,
                "metadata": {"legacy_tipo": "causa", "categoria": "causa"},
                "parent_contract_id": 42,
            },
            {
                "parent_node_id": 301,
                "child_node_id": 302,
                "relationship_type": "CAUSES",
                "parent_node_type": "CAUSE",
                "child_node_type": "CAUSE",
                "node_id": 302,
                "code": "CAUSE:302",
                "name": "Causa nieta",
                "description": "desc child",
                "status": "active",
                "child_cause_id": 502,
                "metadata": {"legacy_tipo": "causa", "categoria": "causa"},
                "parent_cause_id": 501,
            },
        ]
        cursor = _FakeCursor(rows)

        with (
            patch("uc_bib_solv.modules.rca_tree.adapters.outbound.postgres.graph_query_repo._contract_node", return_value={"id": 100}),
            patch("uc_bib_solv.modules.rca_tree.adapters.outbound.postgres.graph_query_repo.db_cursor", return_value=nullcontext(cursor)),
        ):
            projected = graph_query_repo.get_projected_causes_for_contract(42)

        self.assertEqual([row["id"] for row in projected["rows"]], [501, 502])
        self.assertEqual(projected["reused_node_ids"], [])
        self.assertEqual(len(projected["tree"]), 1)
        self.assertEqual(projected["tree"][0]["id"], 501)
        self.assertEqual(projected["tree"][0]["children"][0]["id"], 502)
        self.assertEqual(projected["tree"][0]["contrato_id"], 42)
        self.assertIsNone(projected["tree"][0]["parent_id"])
        self.assertEqual(projected["tree"][0]["children"][0]["parent_id"], 501)
        self.assertFalse(projected["rows"][0]["reused"])
        self.assertFalse(projected["rows"][1]["reused"])

        self.assertEqual(len(cursor.executed), 1)
        sql, params = cursor.executed[0]
        self.assertIn("WITH RECURSIVE reachable_contracts AS", sql)
        self.assertIn("child_node.node_type = 'CONTRACT'", sql)
        self.assertIn("child_node.node_type = 'CAUSE'", sql)
        self.assertEqual(params, (100, 42))
