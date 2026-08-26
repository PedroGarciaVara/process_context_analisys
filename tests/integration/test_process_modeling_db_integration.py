from __future__ import annotations

import importlib.util
import sys
import time
from pathlib import Path
from unittest import TestCase

ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "uc_bib_solv"
sys.path.insert(0, str(ROOT))
sys.path.insert(1, str(BACKEND_DIR))

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor  # noqa: E402

APP_SPEC = importlib.util.spec_from_file_location("webapp_java_process_modeling_app", BACKEND_DIR / "app.py")
APP_MODULE = importlib.util.module_from_spec(APP_SPEC)
assert APP_SPEC and APP_SPEC.loader
APP_SPEC.loader.exec_module(APP_MODULE)


class ProcessModelingPostgresIntegrationTests(TestCase):
    """Real PostgreSQL coverage isolated to the pm_* bounded context."""

    def setUp(self):
        self.client = APP_MODULE.create_app().test_client()
        self.process_code = f"TEST_PM_IT_{int(time.time() * 1000)}"
        response = self.client.post("/api/process-modeling/processes", json={"process_code": self.process_code, "name": "Proceso integración PM"})
        self.assertEqual(response.status_code, 201, response.get_json())
        self.process = response.get_json()["data"]

    def tearDown(self):
        with db_cursor() as cursor:
            cursor.execute("DELETE FROM bpm_process WHERE process_id = %s", (self.process["process_id"],))

    def test_process_version_graph_survives_closed_transactions(self):
        version_response = self.client.post(
            f"/api/process-modeling/processes/{self.process['process_id']}/versions",
            json={"change_description": "integración PostgreSQL real"},
        )
        self.assertEqual(version_response.status_code, 201, version_response.get_json())
        version = version_response.get_json()["data"]

        nodes = []
        for code, node_type, name in (("IN", "input", "Entrada"), ("OP", "operation", "Operación"), ("OUT", "output", "Salida")):
            response = self.client.post(
                f"/api/process-modeling/versions/{version['version_id']}/nodes",
                json={"node_code": code, "node_type": node_type, "name": name},
            )
            self.assertEqual(response.status_code, 201, response.get_json())
            nodes.append(response.get_json()["data"])

        for source, target in ((nodes[0], nodes[1]), (nodes[1], nodes[2])):
            response = self.client.post(
                f"/api/process-modeling/versions/{version['version_id']}/transitions",
                json={"source_node_id": source["node_id"], "target_node_id": target["node_id"], "transition_type": "sequence"},
            )
            self.assertEqual(response.status_code, 201, response.get_json())

        # Every repository call has already closed its transaction; this GET proves reconstruction from PG.
        response = self.client.get(f"/api/process-modeling/versions/{version['version_id']}")
        self.assertEqual(response.status_code, 200, response.get_json())
        payload = response.get_json()["data"]
        self.assertEqual(payload["process"]["process_code"], self.process_code)
        self.assertEqual(payload["version"]["version_number"], 1)
        self.assertEqual([node["node_code"] for node in payload["nodes"]], ["IN", "OP", "OUT"])
        self.assertEqual(len(payload["transitions"]), 2)
        self.assertTrue(payload["validation"]["valid"])

    def test_invalid_transition_does_not_persist(self):
        version_response = self.client.post(f"/api/process-modeling/processes/{self.process['process_id']}/versions", json={})
        version_id = version_response.get_json()["data"]["version_id"]
        node_response = self.client.post(
            f"/api/process-modeling/versions/{version_id}/nodes",
            json={"node_code": "ONLY", "node_type": "operation", "name": "Único"},
        )
        node_id = node_response.get_json()["data"]["node_id"]
        response = self.client.post(
            f"/api/process-modeling/versions/{version_id}/transitions",
            json={"source_node_id": node_id, "target_node_id": node_id, "transition_type": "sequence"},
        )
        self.assertEqual(response.status_code, 400, response.get_json())
        self.assertEqual(response.get_json()["code"], "self_transition")
        graph = self.client.get(f"/api/process-modeling/versions/{version_id}").get_json()["data"]
        self.assertEqual(graph["transitions"], [])


if __name__ == "__main__":
    import unittest

    unittest.main()
