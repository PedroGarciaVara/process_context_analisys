import unittest
from contextlib import nullcontext
from unittest.mock import patch
from uuid import uuid4

from uc_bib_solv.modules.bpm.adapters.outbound.postgres.pm_process_repo import NodeRepository


class ReturningCursor:
    def __init__(self):
        self.executed = []
        self.rows = [
            {"node_id": str(uuid4()), "node_type": "operation", "properties": {}},
            {"transition_id": "first"},
            {"transition_id": "second"},
        ]

    def execute(self, query, params=None):
        self.executed.append(query)

    def fetchone(self):
        return self.rows.pop(0)


class ProcessRepositoryReturningTests(unittest.TestCase):
    def test_insert_operation_fetches_each_returning_row_immediately(self):
        cursor = ReturningCursor()
        process_id = str(uuid4())
        node = {"node_id": str(uuid4()), "node_code": "OP-002", "node_type": "operation", "name": "Intermedia", "properties": {}}
        edge = lambda transition_id, source, target: {"transition_id": transition_id, "source_node_id": source, "target_node_id": target, "transition_type": "sequence", "properties": {}}
        first = edge(str(uuid4()), str(uuid4()), str(uuid4()))
        second = edge(str(uuid4()), str(uuid4()), str(uuid4()))
        with patch("uc_bib_solv.modules.bpm.adapters.outbound.postgres.pm_process_repo.db_cursor", return_value=nullcontext(cursor)):
            result = NodeRepository().insert_operation_on_transition(process_id, node, {"transition_id": str(uuid4())}, first, second)
        self.assertEqual([item["transition_id"] for item in result["transitions"]], ["first", "second"])
        self.assertEqual(len(cursor.rows), 0)


if __name__ == "__main__":
    unittest.main()
