from __future__ import annotations

from pathlib import Path
import sys
from unittest import TestCase
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(1, str(ROOT / "uc_bib_solv" / "webapp_java" / "python-backend"))

from repositories import causas_repository
from services import causas_service


class TreePayloadTests(TestCase):
    @patch("repositories.causas_repository.analisis_causas_repo.get_by_contrato")
    @patch("repositories.causas_repository.hipotesis_repo.get_by_causa")
    @patch("repositories.causas_repository.causa_repo.build_tree")
    @patch("repositories.causas_repository.causa_repo.get_by_contrato")
    @patch("repositories.causas_repository.contrato_repo.get_by_id")
    def test_repository_tree_payload_uses_selected_contract_causes(
        self,
        get_contract_mock,
        get_causas_mock,
        build_tree_mock,
        get_hypotheses_mock,
        get_analysis_mock,
    ):
        get_contract_mock.return_value = {
            "id": 17,
            "nombre": "Contrato 17",
            "proceso_id": 9,
            "activo": True,
        }
        causas = [
            {
                "id": 69,
                "contrato_id": 17,
                "parent_id": None,
                "nombre": "Root 17",
                "descripcion": "desc",
                "tipo": "causa",
                "categoria": "causa",
            },
            {
                "id": 70,
                "contrato_id": 17,
                "parent_id": 69,
                "nombre": "Child 17",
                "descripcion": "desc",
                "tipo": "causa",
                "categoria": "causa",
            },
        ]
        get_causas_mock.return_value = causas
        build_tree_mock.return_value = [
            {
                **causas[0],
                "children": [{**causas[1], "children": []}],
            }
        ]
        get_hypotheses_mock.side_effect = lambda causa_id: [{"id": 1, "causa_id": causa_id, "estado": "pendiente"}]
        get_analysis_mock.return_value = []

        payload = causas_repository.get_tree_payload("arbol", contract_id=17)

        get_contract_mock.assert_called_once_with(17)
        get_causas_mock.assert_called_once_with(17)
        build_tree_mock.assert_called_once_with(causas)
        self.assertEqual(payload["contract"]["id"], 17)
        self.assertEqual(payload["selected_cause_id"], 69)
        self.assertEqual(payload["tree"][0]["id"], 69)
        self.assertEqual(payload["tree"][0]["children"][0]["id"], 70)
        self.assertEqual(payload["detail"]["cause"]["id"], 69)

    @patch("services.causas_service.get_tree_repository_payload")
    def test_service_tree_payload_forwards_selected_contract(self, get_tree_repository_payload_mock):
        get_tree_repository_payload_mock.return_value = {
            "contract": {"id": 17},
            "tree": [{"id": 69, "children": []}],
            "selected_cause_id": 69,
            "zoom": 1.0,
        }

        payload = causas_service.get_tree_payload("arbol", contract_id=17)

        get_tree_repository_payload_mock.assert_called_once_with(
            "arbol",
            selected_cause_id=None,
            zoom=1.0,
            contract_id=17,
        )
        self.assertEqual(payload["contract"]["id"], 17)
        self.assertEqual(payload["status"], "ok")


class DeleteCauseTests(TestCase):
    @patch("services.causas_service.delete_causa")
    def test_delete_causa_record_returns_success(self, delete_causa_mock):
        delete_causa_mock.return_value = True

        result = causas_service.delete_causa_record(44)

        delete_causa_mock.assert_called_once_with(44)
        self.assertEqual(result, {"deleted": True, "message": "Causa eliminada."})

    @patch("services.causas_service.delete_causa")
    def test_delete_causa_record_raises_when_missing(self, delete_causa_mock):
        delete_causa_mock.return_value = False

        with self.assertRaisesRegex(ValueError, "Causa no encontrada"):
            causas_service.delete_causa_record(404)


class ReusableNodeFlowTests(TestCase):
    @patch("services.causas_service.search_reusable_nodes_repository")
    def test_search_reusable_nodes_forwards_context_and_limits(self, search_repository_mock):
        search_repository_mock.return_value = [{"node_id": 31, "node_type": "CAUSE"}]

        payload = causas_service.search_reusable_nodes({
            "node_type": "cause",
            "text": "soldadura",
            "contract_id": "17",
            "parent_id": "69",
            "limit": "12",
        })

        search_repository_mock.assert_called_once_with(
            "cause",
            text="soldadura",
            contract_id=17,
            parent_id=69,
            limit=12,
        )
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["node_type"], "CAUSE")

    @patch("services.causas_service.link_reusable_node_repository")
    def test_link_reusable_node_builds_contract_specific_message(self, link_repository_mock):
        link_repository_mock.return_value = {
            "relationship": {"id": 91},
            "child": {"node_type": "CONTRACT", "node_id": 301},
            "parent": {"node_id": 201},
            "contract_id": 17,
        }

        payload = causas_service.link_reusable_node({
            "contract_id": "17",
            "child_node_id": "301",
        })

        link_repository_mock.assert_called_once_with(
            child_node_id=301,
            contract_id=17,
            parent_id=None,
        )
        self.assertEqual(payload["message"], "Contrato existente vinculado.")

    @patch("services.causas_service.create_contract_child_repository")
    def test_create_contract_node_maps_editor_fields_to_contract_payload(self, create_contract_child_repository_mock):
        create_contract_child_repository_mock.return_value = {
            "contract": {"id": 88},
            "relationship": {"id": 12},
            "parent_contract_id": 17,
        }

        payload = causas_service.create_contract_node({
            "contract_id": "17",
            "nombre": "Contrato de montaje",
            "categoria": "OEE",
            "descripcion": "Reducir variabilidad",
        })

        create_contract_child_repository_mock.assert_called_once_with(
            17,
            "Contrato de montaje",
            objetivo="Reducir variabilidad",
            metrica="OEE",
        )
        self.assertEqual(payload["message"], "Contrato creado y vinculado.")
