import unittest
from types import SimpleNamespace
from uuid import uuid4

from uc_bib_solv.modules.bpm.application import ProcessModelingApplication


class ProcessValidationUseCaseTests(unittest.TestCase):
    def _application(self, process, processes=None):
        repository = SimpleNamespace(
            get=lambda _process_id: process,
            list=lambda: processes if processes is not None else [process],
        )
        return ProcessModelingApplication(repository, SimpleNamespace(), SimpleNamespace(), SimpleNamespace())

    def test_returns_only_stable_validation_result_for_valid_graph(self):
        process_id = str(uuid4())
        first, second = str(uuid4()), str(uuid4())
        process = {
            "process_id": process_id,
            "process_code": "P-1",
            "name": "Proceso",
            "status": "draft",
            "nodes": [
                {"node_id": first, "node_code": "IN", "node_type": "input", "name": "Entrada"},
                {"node_id": second, "node_code": "OUT", "node_type": "output", "name": "Salida"},
            ],
            "transitions": [{"source_node_id": first, "target_node_id": second, "transition_type": "sequence"}],
        }
        result = self._application(process).validate_process(process_id)
        self.assertEqual({"valid": True, "errors": []}, result)

    def test_validates_nodes_transitions_and_hierarchy(self):
        process_id, parent_id = str(uuid4()), str(uuid4())
        node_id = str(uuid4())
        process = {
            "process_id": process_id,
            "process_code": "P-1",
            "name": "Proceso",
            "parent_process_id": parent_id,
            "status": "draft",
            "nodes": [
                {"node_id": node_id, "node_code": "DUP"},
                {"node_id": str(uuid4()), "node_code": "DUP"},
            ],
            "transitions": [{"source_node_id": node_id, "target_node_id": node_id}],
        }
        parent = {"process_id": parent_id, "process_code": "P-0", "name": "Padre", "status": "draft"}
        result = self._application(process, [process, {**parent, "parent_process_id": process_id}]).validate_process(process_id)
        self.assertFalse(result["valid"])
        self.assertEqual(
            {"duplicate_node_code", "self_transition", "graph_cycle", "hierarchy_cycle"},
            {error["code"] for error in result["errors"]},
        )

    def test_reports_invalid_persisted_transition_type(self):
        process_id = str(uuid4())
        first, second = str(uuid4()), str(uuid4())
        process = {
            "process_id": process_id,
            "process_code": "P-1",
            "name": "Proceso",
            "status": "draft",
            "nodes": [{"node_id": first, "node_code": "IN"}, {"node_id": second, "node_code": "OUT"}],
            "transitions": [{"source_node_id": first, "target_node_id": second, "transition_type": "unknown"}],
        }
        result = self._application(process).validate_process(process_id)
        self.assertFalse(result["valid"])
        self.assertIn("invalid_transition_type", {error["code"] for error in result["errors"]})


if __name__ == "__main__":
    unittest.main()
