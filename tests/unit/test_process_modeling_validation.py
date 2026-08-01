import unittest
from uuid import uuid4

from app.domain.process_modeling.validators import validate_graph, validate_hierarchy


class ProcessModelingValidationTests(unittest.TestCase):
    def test_rejects_duplicate_codes_and_cycles(self):
        first, second = str(uuid4()), str(uuid4())
        nodes = [{"node_id": first, "node_code": "A"}, {"node_id": second, "node_code": "A"}]
        transitions = [{"source_node_id": first, "target_node_id": second}, {"source_node_id": second, "target_node_id": first}]
        result = validate_graph(nodes, transitions)
        self.assertFalse(result["valid"])
        self.assertEqual({"duplicate_node_code", "graph_cycle"}, {item["code"] for item in result["errors"]})

    def test_rejects_hierarchy_cycle(self):
        a, b = str(uuid4()), str(uuid4())
        result = validate_hierarchy(a, {a: b, b: a})
        self.assertEqual("hierarchy_cycle", result[0]["code"])


if __name__ == "__main__":
    unittest.main()
