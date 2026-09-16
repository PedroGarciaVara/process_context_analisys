import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.bpm.application import ProcessModelingApplication


class AtomicNodeCreationTests(unittest.TestCase):
    def test_derives_transition_target_from_created_node(self):
        process_id, source_id = str(uuid4()), str(uuid4())
        process = {"process_id": process_id, "process_code": "P-1", "name": "Proceso", "description": None, "parent_process_id": None, "abstraction_level": 0, "status": "draft", "nodes": [{"node_id": source_id, "process_id": process_id, "node_type": "input", "node_code": "IN", "name": "Entrada"}], "transitions": []}
        nodes = SimpleNamespace(
            get=lambda node_id: process["nodes"][0] if str(node_id) == source_id else None,
            create_with_transition=lambda _process_id, node, transition: {"node": node, "transition": transition},
        )
        processes = SimpleNamespace(get=lambda _process_id: process)
        application = ProcessModelingApplication(processes, nodes, SimpleNamespace(), SimpleNamespace())

        result = application.create_node_with_transition(process_id, {"node": {"node_code": "OP-1", "node_type": "operation", "name": "Operación"}, "transition": {"source_node_id": source_id, "transition_type": "sequence"}})

        self.assertEqual(result["transition"]["target_node_id"], result["node"]["node_id"])
        self.assertEqual(result["node"]["process_id"], process_id)
        self.assertEqual(result["node"]["node_code"], "OP-001")

    def test_invalid_graph_is_rejected_before_persistence(self):
        process_id = str(uuid4())
        process = {"process_id": process_id, "process_code": "P-1", "name": "Proceso", "description": None, "parent_process_id": None, "abstraction_level": 0, "status": "draft", "nodes": [], "transitions": []}
        calls = []
        nodes = SimpleNamespace(get=lambda _node_id: None, create_with_transition=lambda *args: calls.append(args))
        application = ProcessModelingApplication(SimpleNamespace(get=lambda _process_id: process), nodes, SimpleNamespace(), SimpleNamespace())

        with self.assertRaises(Exception):
            application.create_node_with_transition(process_id, {"node": {"node_code": "OP-1", "node_type": "operation", "name": "Operación"}, "transition": {"source_node_id": str(uuid4()), "transition_type": "sequence"}})
        self.assertEqual(calls, [])


if __name__ == "__main__":
    unittest.main()
