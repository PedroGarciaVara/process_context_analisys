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


if __name__ == "__main__":
    unittest.main()
