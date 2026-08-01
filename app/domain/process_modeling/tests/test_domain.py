import unittest
from uuid import uuid4

from app.domain.process_modeling.entities import ProcessDefinition, ProcessNode, ProcessTransition, ProcessVersion
from app.domain.process_modeling.exceptions import ProcessModelingError
from app.domain.process_modeling.validators import validate_graph, validate_hierarchy


class ProcessModelingDomainTests(unittest.TestCase):
    def test_entities_are_framework_free_and_serializable(self):
        process = ProcessDefinition(process_code="PROC-01", name="Proceso 1")
        version = ProcessVersion(process_id=process.process_id)
        node = ProcessNode(version_id=version.version_id, node_code="N-01", node_type="input", name="Entrada")
        other = ProcessNode(version_id=version.version_id, node_code="N-02", node_type="output", name="Salida")
        transition = ProcessTransition(version_id=version.version_id, source_node_id=node.node_id, target_node_id=other.node_id)
        self.assertEqual(process.process_code, "PROC-01")
        self.assertEqual(transition.transition_type, "sequence")

    def test_rejects_invalid_node_type_and_self_transition(self):
        version_id = str(uuid4())
        with self.assertRaises(ProcessModelingError):
            ProcessNode(version_id=version_id, node_code="bad", node_type="transport", name="No permitido")
        with self.assertRaises(ProcessModelingError):
            ProcessTransition(version_id=version_id, source_node_id=version_id, target_node_id=version_id)

    def test_graph_validation_is_deterministic_and_reports_duplicates(self):
        version_id = str(uuid4())
        nodes = [
            {"node_id": str(uuid4()), "node_code": "A"},
            {"node_id": str(uuid4()), "node_code": "A"},
        ]
        result = validate_graph(nodes, [])
        self.assertFalse(result["valid"])
        self.assertEqual(result["errors"][0]["code"], "duplicate_node_code")

    def test_hierarchy_cycle_is_rejected(self):
        result = validate_hierarchy("", {"a": "b", "b": "a"})
        self.assertEqual(result[0]["code"], "hierarchy_cycle")


if __name__ == "__main__":
    unittest.main()
