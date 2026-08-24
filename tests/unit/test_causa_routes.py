from __future__ import annotations

from unittest import TestCase
from unittest.mock import patch

from flask import Flask

from uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat import bp as legacy_causas_bp


def create_legacy_app():
    application = Flask(__name__)
    application.register_blueprint(legacy_causas_bp)
    return application


class CausaRoutesTests(TestCase):
    def setUp(self):
        application = create_legacy_app()
        application.testing = True
        self.client = application.test_client()

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.save_cause")
    def test_create_causa_route_returns_201_and_passes_payload(self, save_cause_mock):
        save_cause_mock.return_value = {"cause": {"id": 61}, "message": "Causa creada."}

        response = self.client.post(
            "/api/causas",
            json={"contract_id": 6, "nombre": "Nueva causa"},
        )

        self.assertEqual(response.status_code, 201)
        save_cause_mock.assert_called_once_with({"contract_id": 6, "nombre": "Nueva causa"})
        self.assertEqual(response.get_json()["cause"]["id"], 61)

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.save_cause")
    def test_update_causa_route_injects_causa_id(self, save_cause_mock):
        save_cause_mock.return_value = {"cause": {"id": 61}, "message": "Causa actualizada."}

        response = self.client.patch(
            "/api/causas/61",
            json={"nombre": "Causa editada"},
        )

        self.assertEqual(response.status_code, 200)
        save_cause_mock.assert_called_once_with({"nombre": "Causa editada", "causa_id": 61})
        self.assertEqual(response.get_json()["message"], "Causa actualizada.")

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.delete_causa_record")
    def test_delete_causa_route_returns_success(self, delete_causa_mock):
        delete_causa_mock.return_value = {"deleted": True, "message": "Causa eliminada."}

        response = self.client.delete("/api/causas/61")

        self.assertEqual(response.status_code, 200)
        delete_causa_mock.assert_called_once_with(61)
        self.assertEqual(response.get_json()["deleted"], True)

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.save_hypothesis")
    def test_create_hypothesis_route_injects_cause_id(self, save_hypothesis_mock):
        save_hypothesis_mock.return_value = {"hypothesis": {"id": 91}, "message": "Hipotesis creada."}

        response = self.client.post(
            "/api/causas/61/hipotesis",
            json={"descripcion": "Hipotesis nueva"},
        )

        self.assertEqual(response.status_code, 201)
        save_hypothesis_mock.assert_called_once_with({"descripcion": "Hipotesis nueva", "cause_id": 61})
        self.assertEqual(response.get_json()["hypothesis"]["id"], 91)

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.save_hypothesis")
    def test_update_hypothesis_route_injects_hypothesis_id(self, save_hypothesis_mock):
        save_hypothesis_mock.return_value = {"hypothesis": {"id": 91}, "message": "Hipotesis actualizada."}

        response = self.client.patch(
            "/api/hipotesis/91",
            json={"descripcion": "Hipotesis editada"},
        )

        self.assertEqual(response.status_code, 200)
        save_hypothesis_mock.assert_called_once_with({"descripcion": "Hipotesis editada", "hypothesis_id": 91})
        self.assertEqual(response.get_json()["message"], "Hipotesis actualizada.")

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.delete_hypothesis_record")
    def test_delete_hypothesis_route_returns_success(self, delete_hypothesis_mock):
        delete_hypothesis_mock.return_value = {"deleted": True, "message": "Hipotesis eliminada."}

        response = self.client.delete("/api/hipotesis/91")

        self.assertEqual(response.status_code, 200)
        delete_hypothesis_mock.assert_called_once_with(91)
        self.assertEqual(response.get_json()["deleted"], True)

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.get_tree_payload")
    def test_tree_route_passes_selected_contract_to_service(self, get_tree_payload_mock):
        get_tree_payload_mock.return_value = {
            "status": "ok",
            "contract": {"id": 17},
            "tree": [{"id": 69, "children": []}],
            "selected_cause_id": 69,
        }

        response = self.client.get("/api/causas?view=arbol&contract_id=17")

        self.assertEqual(response.status_code, 200)
        get_tree_payload_mock.assert_called_once_with(
            "arbol",
            selected_cause_id=None,
            zoom=1.0,
            contract_id=17,
        )
        self.assertEqual(response.get_json()["contract"]["id"], 17)

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.create_contract_node")
    def test_create_causa_route_can_delegate_to_contract_creation_mode(self, create_contract_node_mock):
        create_contract_node_mock.return_value = {"contract": {"id": 88}, "message": "Contrato creado y vinculado."}

        response = self.client.post(
            "/api/causas",
            json={"contract_id": 17, "nombre": "Contrato hijo", "editor_mode": "new_contract"},
        )

        self.assertEqual(response.status_code, 201)
        create_contract_node_mock.assert_called_once_with(
            {"contract_id": 17, "nombre": "Contrato hijo", "editor_mode": "new_contract"},
        )
        self.assertEqual(response.get_json()["contract"]["id"], 88)

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.search_reusable_nodes")
    def test_reusable_search_route_forwards_query_params(self, search_reusable_nodes_mock):
        search_reusable_nodes_mock.return_value = {"count": 1, "items": [{"node_id": 301}]}

        response = self.client.get("/api/causas/reusable/search?node_type=CONTRACT&contract_id=17&text=horno")

        self.assertEqual(response.status_code, 200)
        args = search_reusable_nodes_mock.call_args.args[0]
        self.assertEqual(args["node_type"], "CONTRACT")
        self.assertEqual(args["contract_id"], "17")
        self.assertEqual(args["text"], "horno")
        self.assertEqual(response.get_json()["count"], 1)

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat.link_reusable_node")
    def test_reusable_link_route_passes_payload(self, link_reusable_node_mock):
        link_reusable_node_mock.return_value = {"relationship": {"id": 55}, "message": "Contrato existente vinculado."}

        response = self.client.post(
            "/api/causas/reusable/link",
            json={"contract_id": 17, "child_node_id": 301},
        )

        self.assertEqual(response.status_code, 201)
        link_reusable_node_mock.assert_called_once_with({"contract_id": 17, "child_node_id": 301})
        self.assertEqual(response.get_json()["relationship"]["id"], 55)
