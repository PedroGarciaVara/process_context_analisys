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

APP_SPEC = importlib.util.spec_from_file_location("backend_process_modeling_app", BACKEND_DIR / "backend_app.py")
APP_MODULE = importlib.util.module_from_spec(APP_SPEC)
assert APP_SPEC and APP_SPEC.loader
APP_SPEC.loader.exec_module(APP_MODULE)


class ProcessModelingPostgresIntegrationTests(TestCase):
    """Real PostgreSQL coverage isolated to the pm_* bounded context."""

    def setUp(self):
        self.client = APP_MODULE.create_app().test_client()
        self.process_code = f"TEST_PM_IT_{int(time.time() * 1000)}"
        response = self.client.post("/api/bpm/processes", json={"process_code": self.process_code, "name": "Proceso integración PM"})
        self.assertEqual(response.status_code, 201, response.get_json())
        self.process = response.get_json()["data"]

    def tearDown(self):
        with db_cursor() as cursor:
            cursor.execute("DELETE FROM bpm_process WHERE process_id = %s", (self.process["process_id"],))
            if getattr(self, "child_process", None):
                cursor.execute("DELETE FROM bpm_process WHERE process_id = %s", (self.child_process["process_id"],))

    def test_subprocess_expansion_returns_child_process_context(self):
        child_response = self.client.post(
            "/api/bpm/processes",
            json={"process_code": f"{self.process_code}_CHILD", "name": "Proceso hijo integración"},
        )
        self.assertEqual(child_response.status_code, 201, child_response.get_json())
        self.child_process = child_response.get_json()["data"]
        node_response = self.client.post(
            f"/api/bpm/processes/{self.process['process_id']}/nodes",
            json={
                "node_code": "SUB-01",
                "node_type": "subprocess",
                "name": "Subflujo integración",
                "child_process_id": self.child_process["process_id"],
            },
        )
        self.assertEqual(node_response.status_code, 201, node_response.get_json())
        node_id = node_response.get_json()["data"]["node_id"]

        response = self.client.get(
            f"/api/bpm/processes/{self.process['process_id']}?expand_node_id={node_id}"
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        payload = response.get_json()["data"]
        self.assertEqual(payload["process_id"], self.child_process["process_id"])
        self.assertEqual(payload["subprocess_context"], {
            "parent_process_id": self.process["process_id"],
            "parent_node_id": node_id,
            "child_process_id": self.child_process["process_id"],
            "breadcrumb_label": "Proceso integración PM > Subflujo integración",
        })
        self.assertNotIn("ProcessVersion", payload)
        self.assertNotIn("version_id", payload)

    def test_process_graph_survives_closed_transactions(self):
        nodes = []
        for code, node_type, name in (("IN", "input", "Entrada"), ("OP", "operation", "Operación"), ("OUT", "output", "Salida")):
            response = self.client.post(
                f"/api/bpm/processes/{self.process['process_id']}/nodes",
                json={"node_code": code, "node_type": node_type, "name": name},
            )
            self.assertEqual(response.status_code, 201, response.get_json())
            nodes.append(response.get_json()["data"])

        for source, target in ((nodes[0], nodes[1]), (nodes[1], nodes[2])):
            response = self.client.post(
                f"/api/bpm/processes/{self.process['process_id']}/transitions",
                json={"source_node_id": source["node_id"], "target_node_id": target["node_id"], "transition_type": "sequence"},
            )
            self.assertEqual(response.status_code, 201, response.get_json())

        # Every repository call has already closed its transaction; this GET proves reconstruction from PG.
        response = self.client.get(f"/api/bpm/processes/{self.process['process_id']}")
        self.assertEqual(response.status_code, 200, response.get_json())
        payload = response.get_json()["data"]
        self.assertEqual(payload["process_code"], self.process_code)
        self.assertEqual([node["node_code"] for node in payload["nodes"]], ["INPUT-001", "OP-001", "OUTPUT-001"])
        self.assertEqual(len(payload["transitions"]), 2)
        self.assertNotIn("versions", payload)

    def test_palette_creation_persists_node_and_transition_atomically(self):
        source = self.client.post(
            f"/api/bpm/processes/{self.process['process_id']}/nodes",
            json={"node_code": "IN", "node_type": "input", "name": "Entrada"},
        ).get_json()["data"]
        response = self.client.post(
            f"/api/bpm/processes/{self.process['process_id']}/nodes-with-transition",
            json={"node": {"node_code": "OP", "node_type": "operation", "name": "Operación"}, "transition": {"source_node_id": source["node_id"], "transition_type": "sequence"}},
        )
        self.assertEqual(response.status_code, 201, response.get_json())
        created = response.get_json()["data"]
        self.assertEqual(created["transition"]["target_node_id"], created["node"]["node_id"])
        process = self.client.get(f"/api/bpm/processes/{self.process['process_id']}").get_json()["data"]
        self.assertEqual(len(process["nodes"]), 2)
        self.assertEqual(len(process["transitions"]), 1)

    def test_validate_endpoint_validates_persisted_graph(self):
        nodes = []
        for code, node_type, name in (("IN", "input", "Entrada"), ("OUT", "output", "Salida")):
            response = self.client.post(
                f"/api/bpm/processes/{self.process['process_id']}/nodes",
                json={"node_code": code, "node_type": node_type, "name": name},
            )
            self.assertEqual(response.status_code, 201, response.get_json())
            nodes.append(response.get_json()["data"])
        response = self.client.post(
            f"/api/bpm/processes/{self.process['process_id']}/transitions",
            json={"source_node_id": nodes[0]["node_id"], "target_node_id": nodes[1]["node_id"], "transition_type": "sequence"},
        )
        self.assertEqual(response.status_code, 201, response.get_json())

        response = self.client.post(f"/api/bpm/processes/{self.process['process_id']}/validate")
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertEqual({"valid": True, "errors": []}, response.get_json()["data"])

    def test_invalid_transition_does_not_persist(self):
        node_response = self.client.post(
            f"/api/bpm/processes/{self.process['process_id']}/nodes",
            json={"node_code": "ONLY", "node_type": "operation", "name": "Único"},
        )
        node_id = node_response.get_json()["data"]["node_id"]
        response = self.client.post(
            f"/api/bpm/processes/{self.process['process_id']}/transitions",
            json={"source_node_id": node_id, "target_node_id": node_id, "transition_type": "sequence"},
        )
        self.assertEqual(response.status_code, 400, response.get_json())
        self.assertEqual(response.get_json()["code"], "self_transition")
        graph = self.client.get(f"/api/bpm/processes/{self.process['process_id']}").get_json()["data"]
        self.assertEqual(graph["transitions"], [])


if __name__ == "__main__":
    import unittest

    unittest.main()
