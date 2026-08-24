import unittest
from unittest.mock import patch

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app


class CausalAnalysisHttpT7Tests(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.analysis_compat.list_recent", return_value=[{"id": 1}])
    def test_list_contract_is_preserved(self, list_recent):
        response = self.app.get("/api/analyses?limit=10&q=oven")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok", "data": [{"id": 1}]})
        list_recent.assert_called_once_with("10", None, "oven")

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.analysis_compat.create_analysis", return_value={"id": 8})
    def test_create_contract_status_and_payload_are_preserved(self, create_analysis):
        response = self.app.post("/api/analyses", json={"template_contract_id": 4, "indication": "x"})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["data"], {"id": 8})
        create_analysis.assert_called_once_with({"template_contract_id": 4, "indication": "x"})

    @patch("uc_bib_solv.modules.rca_tree.adapters.inbound.http.analysis_compat.get_analysis", return_value=None)
    def test_detail_not_found_error_is_preserved(self, get_analysis):
        response = self.app.get("/api/analyses/99")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["message"], "Analisis no encontrado.")
