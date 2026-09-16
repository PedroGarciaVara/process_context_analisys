import unittest
from types import SimpleNamespace
from uuid import uuid4

from uc_bib_solv.modules.bpm.application.process_modeling_application import ProcessModelingApplication
from uc_bib_solv.modules.bpm.domain.processes.exceptions import ProcessModelingError


class FakeLayouts:
    def __init__(self):
        self.positions = []

    def list_for_process(self, _process_id):
        return list(self.positions)

    def replace_for_process(self, _process_id, positions):
        self.positions = list(positions)
        return list(self.positions)


class ProcessLayoutUseCaseTests(unittest.TestCase):
    def setUp(self):
        self.process_id = str(uuid4())
        self.node_id = str(uuid4())
        self.process = {"process_id": self.process_id, "nodes": [{"node_id": self.node_id}]}
        self.layouts = FakeLayouts()
        processes = SimpleNamespace(get=lambda process_id: self.process if str(process_id) == self.process_id else None)
        self.app = ProcessModelingApplication(processes, SimpleNamespace(), SimpleNamespace(), self.layouts)

    def test_get_returns_shared_projection(self):
        result = self.app.get_process_layout(self.process_id)
        self.assertEqual("manual_overrides", result["strategy"])
        self.assertEqual([], result["positions"])

    def test_replace_and_clear_layout(self):
        result = self.app.replace_process_layout(self.process_id, {"positions": [
            {"node_id": self.node_id, "x": 12, "y": 34},
        ]})
        self.assertEqual(self.node_id, result["positions"][0]["node_id"])
        self.assertEqual([], self.app.replace_process_layout(self.process_id, {"positions": []})["positions"])

    def test_rejects_node_from_another_process_before_repository(self):
        with self.assertRaises(ProcessModelingError) as raised:
            self.app.replace_process_layout(self.process_id, {"positions": [
                {"node_id": str(uuid4()), "x": 12, "y": 34},
            ]})
        self.assertEqual("layout_node_process_mismatch", raised.exception.code)
        self.assertEqual([], self.layouts.positions)


if __name__ == "__main__":
    unittest.main()
