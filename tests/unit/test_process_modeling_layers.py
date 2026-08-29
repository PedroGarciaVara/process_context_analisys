import unittest
from uuid import uuid4

from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessNode
from uc_bib_solv.modules.bpm.domain.processes.rules import validate_graph
from uc_bib_solv.modules.bpm.adapters.outbound.bpm_persistence import BpmPostgresPersistenceAdapter


class ProcessModelingLayerTests(unittest.TestCase):
    def test_domain_entity_is_framework_free_and_validates(self):
        node = ProcessNode(process_id=str(uuid4()), node_code="N-1", name="Input")
        self.assertEqual("N-1", node.node_code)

    def test_domain_graph_validation_uses_plain_values(self):
        first, second = str(uuid4()), str(uuid4())
        result = validate_graph(
            [{"node_id": first, "node_code": "A"}, {"node_id": second, "node_code": "A"}],
            [{"source_node_id": first, "target_node_id": second}, {"source_node_id": second, "target_node_id": first}],
        )
        self.assertFalse(result["valid"])

    def test_persistence_adapter_requires_canonical_ports(self):
        adapter = BpmPostgresPersistenceAdapter(processes="p", nodes="n", transitions="t")
        self.assertEqual(("p", "n", "t"), (adapter.processes, adapter.nodes, adapter.transitions))


if __name__ == "__main__":
    unittest.main()
