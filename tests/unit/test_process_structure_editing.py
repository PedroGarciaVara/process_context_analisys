import unittest
from types import SimpleNamespace
from uuid import uuid4

from uc_bib_solv.modules.bpm.application import ProcessModelingApplication


def make_process():
    process_id = str(uuid4())
    a, b, c = [str(uuid4()) for _ in range(3)]
    nodes = [
        {"node_id": a, "process_id": process_id, "node_code": "OP-001", "node_type": "operation", "name": "A"},
        {"node_id": b, "process_id": process_id, "node_code": "OP-002", "node_type": "operation", "name": "B"},
        {"node_id": c, "process_id": process_id, "node_code": "OP-003", "node_type": "operation", "name": "C"},
    ]
    transitions = [{"transition_id": str(uuid4()), "process_id": process_id, "source_node_id": a, "target_node_id": b, "transition_type": "sequence", "properties": {}}]
    return {"process_id": process_id, "process_code": "P-1", "name": "P", "description": None, "parent_process_id": None, "abstraction_level": 0, "status": "draft", "nodes": nodes, "transitions": transitions}


class MemoryNodes:
    def __init__(self, process):
        self.process = process

    def get(self, node_id):
        return next((node for node in self.process["nodes"] if str(node["node_id"]) == str(node_id)), None)

    def insert_operation_on_transition(self, _process_id, node, original, first, second):
        self.process["nodes"].append(node)
        self.process["transitions"] = [edge for edge in self.process["transitions"] if edge["transition_id"] != original["transition_id"]]
        self.process["transitions"].extend([first, second])
        return {"node": node, "transitions": [first, second]}

    def delete_with_reconnect(self, node_id, reconnect_edges):
        self.process["nodes"] = [node for node in self.process["nodes"] if str(node["node_id"]) != str(node_id)]
        self.process["transitions"] = [edge for edge in self.process["transitions"] if str(edge["source_node_id"]) != str(node_id) and str(edge["target_node_id"]) != str(node_id)]
        self.process["transitions"].extend(reconnect_edges)
        return {"deleted": True, "node_id": node_id, "reconnected": reconnect_edges}


class StructureEditingTests(unittest.TestCase):
    def app(self, process):
        processes = SimpleNamespace(get=lambda _id: process)
        nodes = MemoryNodes(process)
        transitions = SimpleNamespace(get=lambda transition_id: next((edge for edge in process["transitions"] if edge["transition_id"] == transition_id), None))
        return ProcessModelingApplication(processes, nodes, transitions, SimpleNamespace())

    def test_insert_operation_splits_original_transition(self):
        process = make_process()
        original = process["transitions"][0]
        original_pair = (original["source_node_id"], original["target_node_id"])
        result = self.app(process).insert_operation(process["process_id"], process["transitions"][0]["transition_id"], {"name": "Intermedia"})
        self.assertEqual(result["node"]["name"], "Intermedia")
        self.assertEqual(len(process["transitions"]), 2)
        self.assertNotIn(original_pair, {(edge["source_node_id"], edge["target_node_id"]) for edge in process["transitions"]})

    def test_reconnect_requires_simple_line(self):
        process = make_process()
        process["transitions"].append({"transition_id": str(uuid4()), "process_id": process["process_id"], "source_node_id": process["nodes"][0]["node_id"], "target_node_id": process["nodes"][1]["node_id"], "transition_type": "sequence", "properties": {}})
        with self.assertRaises(Exception) as context:
            self.app(process).delete_operation(process["nodes"][1]["node_id"], True)
        self.assertEqual(getattr(context.exception, "code", None), "reconnect_requires_single_line")


if __name__ == "__main__":
    unittest.main()
