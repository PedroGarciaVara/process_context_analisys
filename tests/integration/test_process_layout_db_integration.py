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

APP_SPEC = importlib.util.spec_from_file_location("backend_layout_app", BACKEND_DIR / "backend_app.py")
APP_MODULE = importlib.util.module_from_spec(APP_SPEC)
assert APP_SPEC and APP_SPEC.loader
APP_SPEC.loader.exec_module(APP_MODULE)


class ProcessLayoutPostgresIntegrationTests(TestCase):
    def setUp(self):
        self.client = APP_MODULE.create_app().test_client()
        stamp = int(time.time() * 1000)
        response = self.client.post("/api/bpm/processes", json={"name": f"Layout IT {stamp}"})
        self.assertEqual(201, response.status_code, response.get_json())
        self.process = response.get_json()["data"]
        self.node = self.client.post(
            f"/api/bpm/processes/{self.process['process_id']}/nodes",
            json={"node_type": "operation", "name": "Nodo movible"},
        ).get_json()["data"]
        self.extra_processes = []

    def tearDown(self):
        for process in [self.process, *self.extra_processes]:
            with db_cursor() as cursor:
                cursor.execute("DELETE FROM bpm_process WHERE process_id=%s", (process["process_id"],))

    def test_replace_get_and_empty_clear_current_layout(self):
        url = f"/api/bpm/processes/{self.process['process_id']}/layout"
        response = self.client.put(url, json={"positions": [
            {"node_id": self.node["node_id"], "x": 120.125, "y": -32.5},
        ]})
        self.assertEqual(200, response.status_code, response.get_json())
        self.assertEqual(120.125, response.get_json()["data"]["positions"][0]["x"])

        second_client = APP_MODULE.create_app().test_client()
        persisted = second_client.get(url).get_json()["data"]
        self.assertEqual(self.node["node_id"], persisted["positions"][0]["node_id"])
        self.assertEqual([], self.client.put(url, json={"positions": []}).get_json()["data"]["positions"])
        self.assertEqual([], self.client.get(url).get_json()["data"]["positions"])

    def test_replacement_removes_omitted_overrides_and_node_delete_cascades(self):
        second_node = self.client.post(
            f"/api/bpm/processes/{self.process['process_id']}/nodes",
            json={"node_type": "operation", "name": "Segundo nodo"},
        ).get_json()["data"]
        url = f"/api/bpm/processes/{self.process['process_id']}/layout"
        self.client.put(url, json={"positions": [
            {"node_id": self.node["node_id"], "x": 1, "y": 2},
            {"node_id": second_node["node_id"], "x": 3, "y": 4},
        ]})
        replaced = self.client.put(url, json={"positions": [
            {"node_id": second_node["node_id"], "x": 30, "y": 40},
        ]}).get_json()["data"]
        self.assertEqual([second_node["node_id"]], [item["node_id"] for item in replaced["positions"]])

        self.client.delete(f"/api/bpm/nodes/{second_node['node_id']}")
        self.assertEqual([], self.client.get(url).get_json()["data"]["positions"])

    def test_rejects_node_owned_by_another_process(self):
        other = self.client.post("/api/bpm/processes", json={"name": "Other layout process"}).get_json()["data"]
        self.extra_processes.append(other)
        other_node = self.client.post(
            f"/api/bpm/processes/{other['process_id']}/nodes",
            json={"node_type": "operation", "name": "Foreign node"},
        ).get_json()["data"]
        response = self.client.put(
            f"/api/bpm/processes/{self.process['process_id']}/layout",
            json={"positions": [{"node_id": other_node["node_id"], "x": 1, "y": 2}]},
        )
        self.assertEqual(400, response.status_code, response.get_json())
        self.assertEqual("layout_node_process_mismatch", response.get_json()["code"])


if __name__ == "__main__":
    import unittest

    unittest.main()
