from __future__ import annotations

from pathlib import Path
import sys
import time
from unittest import TestCase

ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "uc_bib_solv"
sys.path.insert(0, str(ROOT))
sys.path.insert(1, str(BACKEND_DIR))

from uc_bib_solv.modules.bpm.adapters.outbound.postgres import contrato_repo, proceso_repo
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import (
    analisis_causas_detalle_repo,
    analisis_causas_repo,
    causa_repo,
    graph_sync,
    graph_query_repo,
    hipotesis_repo,
    node_repo,
    relationship_repo,
)
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import causas_repository as java_causas_repository


class GraphDbIntegrationTests(TestCase):
    def setUp(self):
        self.stamp = int(time.time() * 1000)
        self.created_process_ids: list[int] = []
        self.created_contract_ids: list[int] = []
        self.created_causa_ids: list[int] = []
        self.created_hypothesis_ids: list[int] = []
        self.created_analysis_ids: list[int] = []

        self.process = proceso_repo.create(f"IT GRAPH PROC {self.stamp}")
        self.created_process_ids.append(int(self.process["id"]))

        self.contract = contrato_repo.create(
            int(self.process["id"]),
            f"IT GRAPH CONTRACT {self.stamp}",
            "metric",
            "goal",
        )
        self.created_contract_ids.append(int(self.contract["id"]))

        self.root_cause = causa_repo.create(
            int(self.contract["id"]),
            f"IT GRAPH ROOT {self.stamp}",
            "root description",
            "causa",
            "causa",
        )
        self.created_causa_ids.append(int(self.root_cause["id"]))

        self.child_cause = causa_repo.create(
            int(self.contract["id"]),
            f"IT GRAPH CHILD {self.stamp}",
            "child description",
            "causa",
            "causa",
            parent_id=int(self.root_cause["id"]),
        )
        self.created_causa_ids.append(int(self.child_cause["id"]))

        self.hypothesis = hipotesis_repo.create(
            int(self.child_cause["id"]),
            f"IT GRAPH HYP {self.stamp}",
            "aceptacion",
            "criterion",
            "pendiente",
        )
        self.created_hypothesis_ids.append(int(self.hypothesis["id"]))

    def _create_process_and_contract(self, label: str) -> tuple[dict, dict]:
        process = proceso_repo.create(f"{label} PROC {self.stamp}")
        self.created_process_ids.append(int(process["id"]))
        contract = contrato_repo.create(
            int(process["id"]),
            f"{label} CONTRACT {self.stamp}",
            "metric",
            "goal",
        )
        self.created_contract_ids.append(int(contract["id"]))
        return process, contract

    def _create_cause(
        self,
        contract_id: int,
        label: str,
        *,
        description: str = "description",
        tipo: str = "causa",
        categoria: str = "causa",
        parent_id: int | None = None,
    ) -> dict:
        cause = causa_repo.create(
            int(contract_id),
            f"{label} {self.stamp}",
            description,
            tipo,
            categoria,
            parent_id=parent_id,
        )
        self.created_causa_ids.append(int(cause["id"]))
        return cause

    def _legacy_node(self, legacy_table: str, legacy_id: int) -> dict:
        node = node_repo.get_by_legacy_ref(legacy_table, int(legacy_id))
        self.assertIsNotNone(node)
        return node

    def _assert_relationship_exists(
        self,
        parent_node_id: int,
        child_node_id: int,
        relationship_type: str,
    ) -> dict:
        matches = [
            row
            for row in relationship_repo.get_by_parent(int(parent_node_id), relationship_type)
            if int(row["child_node_id"]) == int(child_node_id)
        ]
        self.assertEqual(len(matches), 1)
        return matches[0]

    def _build_depth_three_contract(self, label: str) -> tuple[dict, dict[str, dict]]:
        _, contract = self._create_process_and_contract(label)
        root = self._create_cause(int(contract["id"]), f"{label} ROOT")
        child_a = self._create_cause(int(contract["id"]), f"{label} CHILD A", parent_id=int(root["id"]))
        child_b = self._create_cause(int(contract["id"]), f"{label} CHILD B", parent_id=int(root["id"]))
        grandchild_a1 = self._create_cause(
            int(contract["id"]),
            f"{label} GRANDCHILD A1",
            parent_id=int(child_a["id"]),
        )
        grandchild_a2 = self._create_cause(
            int(contract["id"]),
            f"{label} GRANDCHILD A2",
            parent_id=int(child_a["id"]),
        )
        grandchild_b1 = self._create_cause(
            int(contract["id"]),
            f"{label} GRANDCHILD B1",
            parent_id=int(child_b["id"]),
        )
        grandchild_b2 = self._create_cause(
            int(contract["id"]),
            f"{label} GRANDCHILD B2",
            parent_id=int(child_b["id"]),
        )
        return contract, {
            "root": root,
            "child_a": child_a,
            "child_b": child_b,
            "grandchild_a1": grandchild_a1,
            "grandchild_a2": grandchild_a2,
            "grandchild_b1": grandchild_b1,
            "grandchild_b2": grandchild_b2,
        }

    def tearDown(self):
        with db_cursor() as cur:
            if self.created_analysis_ids:
                cur.execute("DELETE FROM analisis_causas WHERE id = ANY(%s)", (self.created_analysis_ids,))
            if self.created_hypothesis_ids:
                cur.execute("DELETE FROM hipotesis WHERE id = ANY(%s)", (self.created_hypothesis_ids,))
            if self.created_causa_ids:
                cur.execute("DELETE FROM causa WHERE id = ANY(%s)", (self.created_causa_ids,))
            if self.created_contract_ids:
                cur.execute("DELETE FROM contrato_maquina WHERE contrato_id = ANY(%s)", (self.created_contract_ids,))
                cur.execute("DELETE FROM contrato WHERE id = ANY(%s)", (self.created_contract_ids,))
            if self.created_process_ids:
                cur.execute("DELETE FROM proceso WHERE id = ANY(%s)", (self.created_process_ids,))

            node_ids: list[int] = []
            if self.created_process_ids:
                cur.execute(
                    "SELECT id FROM node WHERE legacy_table='proceso' AND legacy_id = ANY(%s)",
                    (self.created_process_ids,),
                )
                node_ids.extend(int(row["id"]) for row in cur.fetchall())
            if self.created_contract_ids:
                cur.execute(
                    "SELECT id FROM node WHERE legacy_table='contrato' AND legacy_id = ANY(%s)",
                    (self.created_contract_ids,),
                )
                node_ids.extend(int(row["id"]) for row in cur.fetchall())
            if self.created_causa_ids:
                cur.execute(
                    "SELECT id FROM node WHERE legacy_table='causa' AND legacy_id = ANY(%s)",
                    (self.created_causa_ids,),
                )
                node_ids.extend(int(row["id"]) for row in cur.fetchall())
            if self.created_hypothesis_ids:
                cur.execute(
                    "SELECT id FROM node WHERE legacy_table='hipotesis' AND legacy_id = ANY(%s)",
                    (self.created_hypothesis_ids,),
                )
                node_ids.extend(int(row["id"]) for row in cur.fetchall())

            if node_ids:
                cur.execute("DELETE FROM relationship WHERE parent_node_id = ANY(%s) OR child_node_id = ANY(%s)", (node_ids, node_ids))
                cur.execute("DELETE FROM node WHERE id = ANY(%s)", (node_ids,))

    def test_graph_nodes_and_relationships_are_created_from_legacy_writes(self):
        root_node = node_repo.get_by_legacy_ref("causa", int(self.root_cause["id"]))
        child_node = node_repo.get_by_legacy_ref("causa", int(self.child_cause["id"]))
        hypothesis_node = node_repo.get_by_legacy_ref("hipotesis", int(self.hypothesis["id"]))

        self.assertIsNotNone(root_node)
        self.assertIsNotNone(child_node)
        self.assertIsNotNone(hypothesis_node)

        projected = graph_query_repo.get_projected_causes_for_contract(int(self.contract["id"]))
        ids = [int(row["id"]) for row in projected["rows"]]
        self.assertIn(int(self.root_cause["id"]), ids)
        self.assertIn(int(self.child_cause["id"]), ids)
        self.assertEqual(projected["reused_node_ids"], [])

    def test_contract_projection_keeps_direct_contract_to_cause_support(self):
        projected = graph_query_repo.get_projected_causes_for_contract(int(self.contract["id"]))

        self.assertEqual(len(projected["rows"]), 2)
        self.assertEqual(projected["reused_node_ids"], [])
        self.assertEqual(len(projected["tree"]), 1)

        tree_root = projected["tree"][0]
        self.assertEqual(int(tree_root["id"]), int(self.root_cause["id"]))
        self.assertIsNone(tree_root["parent_id"])
        self.assertEqual(len(tree_root["children"]), 1)
        self.assertEqual(int(tree_root["children"][0]["id"]), int(self.child_cause["id"]))
        self.assertEqual(int(tree_root["children"][0]["parent_id"]), int(self.root_cause["id"]))

    def test_analysis_detail_backfills_node_id(self):
        analysis = analisis_causas_repo.create(
            int(self.contract["id"]),
            int(self.process["id"]),
            None,
            "tester",
            "opening",
        )
        self.created_analysis_ids.append(int(analysis["id"]))
        detail = analisis_causas_detalle_repo.upsert(
            int(analysis["id"]),
            "hipotesis",
            "validada",
            "ok",
            hipotesis_id=int(self.hypothesis["id"]),
        )
        self.assertIsNotNone(detail["node_id"])

    def test_cause_create_update_delete_keeps_graph_rows_in_sync(self):
        leaf = self._create_cause(
            int(self.contract["id"]),
            "IT GRAPH CRUD LEAF",
            description="draft description",
            tipo="causa",
            categoria="categoria-a",
            parent_id=int(self.root_cause["id"]),
        )
        root_node = self._legacy_node("causa", int(self.root_cause["id"]))
        leaf_node = self._legacy_node("causa", int(leaf["id"]))
        self._assert_relationship_exists(int(root_node["id"]), int(leaf_node["id"]), "CAUSES")

        updated_name = f"IT GRAPH CRUD LEAF UPDATED {self.stamp}"
        updated = causa_repo.update(
            int(leaf["id"]),
            updated_name,
            "updated description",
            "efecto",
            "categoria-b",
        )
        self.assertEqual(updated["nombre"], updated_name)
        self.assertEqual(updated["descripcion"], "updated description")
        self.assertEqual(updated["tipo"], "efecto")
        self.assertEqual(updated["categoria"], "categoria-b")

        persisted_cause = causa_repo.get_by_id(int(leaf["id"]))
        self.assertIsNotNone(persisted_cause)
        self.assertEqual(persisted_cause["nombre"], updated_name)
        self.assertEqual(persisted_cause["descripcion"], "updated description")
        self.assertEqual(persisted_cause["tipo"], "efecto")
        self.assertEqual(persisted_cause["categoria"], "categoria-b")

        persisted_node = self._legacy_node("causa", int(leaf["id"]))
        self.assertEqual(persisted_node["name"], updated_name)
        self.assertEqual(persisted_node["description"], "updated description")
        self.assertEqual(persisted_node["metadata"]["legacy_tipo"], "efecto")
        self.assertEqual(persisted_node["metadata"]["categoria"], "categoria-b")

        projected_before_delete = graph_query_repo.get_projected_causes_for_contract(int(self.contract["id"]))
        self.assertIn(int(leaf["id"]), [int(row["id"]) for row in projected_before_delete["rows"]])

        leaf_node_id = int(persisted_node["id"])
        self.assertTrue(causa_repo.delete(int(leaf["id"])))
        self.assertIsNone(causa_repo.get_by_id(int(leaf["id"])))
        self.assertIsNone(node_repo.get_by_legacy_ref("causa", int(leaf["id"])))
        self.assertEqual(relationship_repo.get_by_child(leaf_node_id, "CAUSES"), [])

        projected_after_delete = graph_query_repo.get_projected_causes_for_contract(int(self.contract["id"]))
        self.assertNotIn(int(leaf["id"]), [int(row["id"]) for row in projected_after_delete["rows"]])

    def test_contract_projection_supports_three_level_cause_hierarchy(self):
        contract, causes = self._build_depth_three_contract("IT GRAPH DEPTH3")

        root_node = self._legacy_node("causa", int(causes["root"]["id"]))
        child_a_node = self._legacy_node("causa", int(causes["child_a"]["id"]))
        child_b_node = self._legacy_node("causa", int(causes["child_b"]["id"]))
        grandchild_nodes = {
            key: self._legacy_node("causa", int(value["id"]))
            for key, value in causes.items()
            if key.startswith("grandchild_")
        }

        root_relationships = relationship_repo.get_by_parent(int(root_node["id"]), "CAUSES")
        self.assertEqual(
            sorted(int(row["child_node_id"]) for row in root_relationships),
            sorted([int(child_a_node["id"]), int(child_b_node["id"])]),
        )
        self.assertEqual(len(relationship_repo.get_by_parent(int(child_a_node["id"]), "CAUSES")), 2)
        self.assertEqual(len(relationship_repo.get_by_parent(int(child_b_node["id"]), "CAUSES")), 2)
        self.assertEqual(len(grandchild_nodes), 4)

        projected = graph_query_repo.get_projected_causes_for_contract(int(contract["id"]))
        self.assertEqual(len(projected["rows"]), 7)
        self.assertEqual(projected["reused_node_ids"], [])
        self.assertEqual(len(projected["tree"]), 1)

        tree_root = projected["tree"][0]
        self.assertEqual(int(tree_root["id"]), int(causes["root"]["id"]))
        self.assertIsNone(tree_root["parent_id"])

        first_level_ids = sorted(int(node["id"]) for node in tree_root["children"])
        self.assertEqual(
            first_level_ids,
            sorted([int(causes["child_a"]["id"]), int(causes["child_b"]["id"])]),
        )

        child_a_tree = next(node for node in tree_root["children"] if int(node["id"]) == int(causes["child_a"]["id"]))
        child_b_tree = next(node for node in tree_root["children"] if int(node["id"]) == int(causes["child_b"]["id"]))

        self.assertEqual(
            sorted(int(node["id"]) for node in child_a_tree["children"]),
            sorted([int(causes["grandchild_a1"]["id"]), int(causes["grandchild_a2"]["id"])]),
        )
        self.assertEqual(
            sorted(int(node["id"]) for node in child_b_tree["children"]),
            sorted([int(causes["grandchild_b1"]["id"]), int(causes["grandchild_b2"]["id"])]),
        )

        flat_parent_ids = {int(row["id"]): row["parent_id"] for row in projected["rows"]}
        self.assertIsNone(flat_parent_ids[int(causes["root"]["id"])])
        self.assertEqual(flat_parent_ids[int(causes["child_a"]["id"])], int(causes["root"]["id"]))
        self.assertEqual(flat_parent_ids[int(causes["child_b"]["id"])], int(causes["root"]["id"]))
        self.assertEqual(flat_parent_ids[int(causes["grandchild_a1"]["id"])], int(causes["child_a"]["id"]))
        self.assertEqual(flat_parent_ids[int(causes["grandchild_a2"]["id"])], int(causes["child_a"]["id"]))
        self.assertEqual(flat_parent_ids[int(causes["grandchild_b1"]["id"])], int(causes["child_b"]["id"]))
        self.assertEqual(flat_parent_ids[int(causes["grandchild_b2"]["id"])], int(causes["child_b"]["id"]))

    def test_contract_to_contract_edge_is_persisted_and_queryable(self):
        child_contract, causes = self._build_depth_three_contract("IT GRAPH CHILD CONTRACT")
        _, parent_contract = self._create_process_and_contract("IT GRAPH PARENT CONTRACT")

        graph_sync.sync_contract_graph(int(parent_contract["id"]))
        parent_node = self._legacy_node("contrato", int(parent_contract["id"]))
        child_node = self._legacy_node("contrato", int(child_contract["id"]))

        relationship = relationship_repo.create(
            int(parent_node["id"]),
            int(child_node["id"]),
            "DEPENDS_ON",
            metadata={"source": "test", "kind": "contract-child"},
        )
        self.assertEqual(relationship["relationship_type"], "DEPENDS_ON")

        outgoing = relationship_repo.get_by_parent(int(parent_node["id"]), "DEPENDS_ON")
        self.assertTrue(any(int(row["child_node_id"]) == int(child_node["id"]) for row in outgoing))

        incoming = relationship_repo.get_by_child(int(child_node["id"]), "DEPENDS_ON")
        self.assertTrue(any(int(row["parent_node_id"]) == int(parent_node["id"]) for row in incoming))

        structural_edges = graph_query_repo.get_structural_edges()
        self.assertTrue(
            any(
                row["relationship_type"] == "DEPENDS_ON"
                and row["parent_node_type"] == "CONTRACT"
                and row["child_node_type"] == "CONTRACT"
                and int(row["parent_node_id"]) == int(parent_node["id"])
                and int(row["child_node_id"]) == int(child_node["id"])
                for row in structural_edges
            )
        )

        reusable_contracts = graph_query_repo.search_reusable_nodes("contract", text=child_contract["nombre"])
        self.assertTrue(any(int(row["legacy_id"]) == int(child_contract["id"]) for row in reusable_contracts))

        child_projection = graph_query_repo.get_projected_causes_for_contract(int(child_contract["id"]))
        self.assertEqual(len(child_projection["rows"]), 7)
        self.assertEqual(int(child_projection["tree"][0]["id"]), int(causes["root"]["id"]))

        parent_projection = graph_query_repo.get_projected_causes_for_contract(int(parent_contract["id"]))
        self.assertEqual(len(parent_projection["rows"]), 7)
        self.assertEqual(parent_projection["reused_node_ids"], [])
        self.assertEqual(len(parent_projection["tree"]), 1)
        self.assertEqual(int(parent_projection["tree"][0]["id"]), int(causes["root"]["id"]))

    def test_java_repository_can_create_contract_child_and_link_existing_contract(self):
        existing_contract, causes = self._build_depth_three_contract("IT GRAPH REUSABLE CONTRACT")
        parent_contract = self.contract

        created = java_causas_repository.create_contract_child(
            int(parent_contract["id"]),
            f"IT GRAPH CHILD FROM DETAIL {self.stamp}",
            objetivo="goal child",
            metrica="metric child",
        )
        created_contract_id = int(created["contract"]["id"])
        self.created_contract_ids.append(created_contract_id)

        parent_node = self._legacy_node("contrato", int(parent_contract["id"]))
        created_node = self._legacy_node("contrato", created_contract_id)
        self._assert_relationship_exists(int(parent_node["id"]), int(created_node["id"]), "DEPENDS_ON")

        existing_node = self._legacy_node("contrato", int(existing_contract["id"]))
        linked = java_causas_repository.link_reusable_node(
            contract_id=created_contract_id,
            child_node_id=int(existing_node["id"]),
        )
        self.assertEqual(linked["child"]["node_type"], "CONTRACT")
        self._assert_relationship_exists(int(created_node["id"]), int(existing_node["id"]), "DEPENDS_ON")

        projection = graph_query_repo.get_projected_causes_for_contract(created_contract_id)
        self.assertEqual(len(projection["tree"]), 1)
        self.assertEqual(int(projection["tree"][0]["id"]), int(causes["root"]["id"]))

        search_results = java_causas_repository.search_reusable_nodes(
            "CONTRACT",
            text=existing_contract["nombre"],
            contract_id=created_contract_id,
        )
        self.assertTrue(search_results)
        self.assertTrue(any(item["already_linked"] for item in search_results if int(item["node_id"]) == int(existing_node["id"])))
        selected = next(item for item in search_results if int(item["node_id"]) == int(existing_node["id"]))
        existing_process = proceso_repo.get_by_id(int(existing_contract["proceso_id"]))
        self.assertEqual(selected["process_name"], existing_process["nombre"])
        self.assertEqual(selected["goal"], existing_contract["objetivo"])
