"""Focused T3 tests for explicit platform wiring and legacy compatibility."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from uc_bib_solv.backend_app import create_app as create_backend_app
from uc_bib_solv.local_server import create_app as create_local_app
from uc_bib_solv.modules.platform.adapters.inbound.http import create_health_blueprint
from uc_bib_solv.modules.platform.infrastructure.config import PlatformConfig


class PlatformBoundaryTests(unittest.TestCase):
    def test_health_adapter_delegates_to_injected_provider(self):
        provider = Mock(return_value={"status": "ok", "source": "fake"})
        application = __import__("flask").Flask(__name__)
        application.register_blueprint(create_health_blueprint(provider))

        response = application.test_client().get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok", "source": "fake"})
        provider.assert_called_once_with()

    def test_legacy_backend_facade_preserves_platform_contracts(self):
        client = create_backend_app().test_client()

        health = client.get("/health")
        bootstrap = client.get("/api/bootstrap")

        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.get_json()["status"], "ok")
        self.assertEqual(bootstrap.status_code, 200)
        self.assertEqual(bootstrap.get_json()["app_name"], "UC_BIB_Solve")
        self.assertIn("pages", bootstrap.get_json())

    def test_local_facade_keeps_spa_startup_and_platform_routes(self):
        client = create_local_app().test_client()

        self.assertEqual(client.get("/").status_code, 200)
        self.assertEqual(client.get("/api/bootstrap").status_code, 200)
        self.assertEqual(client.get("/health").get_json()["ready"], True)

    def test_configuration_is_explicit_and_reloader_is_reversible(self):
        config = PlatformConfig(host="0.0.0.0", port=9000, debug=True, use_reloader=True)

        self.assertEqual((config.host, config.port, config.debug, config.use_reloader), ("0.0.0.0", 9000, True, True))


if __name__ == "__main__":
    unittest.main()

