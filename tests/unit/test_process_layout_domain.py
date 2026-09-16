import math
import unittest
from uuid import uuid4

from uc_bib_solv.modules.bpm.domain.processes.exceptions import ProcessModelingError
from uc_bib_solv.modules.bpm.domain.processes.layout import NodeLayoutPosition, ProcessLayout


class ProcessLayoutDomainTests(unittest.TestCase):
    def test_canonicalizes_finite_coordinates(self):
        position = NodeLayoutPosition(str(uuid4()), 12.34567, -4)
        self.assertEqual((12.346, -4.0), (position.x, position.y))

    def test_rejects_non_finite_boolean_and_out_of_range_coordinates(self):
        for invalid in (True, math.nan, math.inf, -1_000_001):
            with self.subTest(invalid=invalid), self.assertRaises(ProcessModelingError) as raised:
                NodeLayoutPosition(str(uuid4()), invalid, 0)
            self.assertEqual("invalid_layout_coordinate", raised.exception.code)

    def test_requires_positions_list(self):
        with self.assertRaises(ProcessModelingError) as raised:
            ProcessLayout.from_payload(str(uuid4()), {"positions": {}})
        self.assertEqual("invalid_layout_payload", raised.exception.code)

    def test_rejects_duplicate_node_overrides(self):
        process_id, node_id = str(uuid4()), str(uuid4())
        with self.assertRaises(ProcessModelingError) as raised:
            ProcessLayout.from_payload(process_id, {"positions": [
                {"node_id": node_id, "x": 1, "y": 2},
                {"node_id": node_id, "x": 3, "y": 4},
            ]})
        self.assertEqual("duplicate_layout_node", raised.exception.code)

    def test_rejects_nodes_outside_process(self):
        layout = ProcessLayout.from_payload(str(uuid4()), {"positions": [
            {"node_id": str(uuid4()), "x": 1, "y": 2},
        ]})
        with self.assertRaises(ProcessModelingError) as raised:
            layout.assert_nodes_belong_to([])
        self.assertEqual("layout_node_process_mismatch", raised.exception.code)


if __name__ == "__main__":
    unittest.main()
