import unittest
from unittest.mock import patch

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app


class ProcessModelingRouteDelegationTests(unittest.TestCase):
    def test_public_route_uses_canonical_inbound_registration(self):
        with patch("uc_bib_solv.modules.bpm.application.process_modeling_application.ProcessModelingApplication.list_processes", return_value=[]):
            app = create_app()
            response = app.test_client().get("/api/bpm/processes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok", "data": []})

    def test_process_delete_route_delegates_to_process_modeling(self):
        process_id = "550e8400-e29b-41d4-a716-446655440000"
        with patch("uc_bib_solv.modules.bpm.application.process_modeling_application.ProcessModelingApplication.delete_process", return_value={"deleted": True, "process_id": process_id}) as delete:
            app = create_app()
            response = app.test_client().delete(f"/api/bpm/processes/{process_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok", "data": {"deleted": True, "process_id": process_id}})
        delete.assert_called_once_with(process_id, False)

    def test_process_delete_route_allows_delete_method_on_canonical_path(self):
        app = create_app()
        rule = next(
            rule for rule in app.url_map.iter_rules()
            if str(rule) == "/api/bpm/processes/<process_id>" and "DELETE" in rule.methods
        )
        self.assertIn("DELETE", rule.methods)


if __name__ == "__main__":
    unittest.main()
