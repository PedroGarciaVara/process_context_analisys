import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app


class ProcessModelingApiTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    @patch("uc_bib_solv.modules.platform.infrastructure.app_factory.process_modeling_service.list_processes", return_value=[{"process_code": "P-1"}])
    def test_list_uses_stable_envelope(self, _list):
        response = self.client.get("/api/process-modeling/processes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok", "data": [{"process_code": "P-1"}]})

    def test_domain_error_is_not_exposed_as_traceback(self):
        with patch("uc_bib_solv.modules.platform.infrastructure.app_factory.process_modeling_service.get_version", side_effect=ValueError("bad")):
            response = self.client.get(f"/api/process-modeling/versions/{uuid4()}")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["status"], "error")
        self.assertNotIn("Traceback", response.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
