import unittest
from contextlib import contextmanager
from unittest.mock import patch

from uc_bib_solv.modules.bpm.adapters.outbound.postgres import contrato_repo


class _Cursor:
    def __init__(self):
        self.queries = []
        self.rowcount = 1

    def execute(self, query, params):
        self.queries.append((" ".join(query.split()), params))


class ContractDeleteDependenciesTest(unittest.TestCase):
    def test_detaches_cause_tree_and_cleans_analysis_results_before_deleting_contract(self):
        cursor = _Cursor()

        @contextmanager
        def fake_db_cursor():
            yield cursor

        with patch.object(contrato_repo, "db_cursor", fake_db_cursor):
            self.assertTrue(contrato_repo.delete(42))

        self.assertEqual(len(cursor.queries), 3)
        self.assertEqual(
            cursor.queries[0],
            ("UPDATE causa SET parent_id=NULL WHERE contrato_id=%s", (42,)),
        )
        self.assertTrue(cursor.queries[1][0].startswith("DELETE FROM analisis_resultado"))
        self.assertEqual(cursor.queries[1][1], (42,))
        self.assertEqual(cursor.queries[2], ("DELETE FROM contrato WHERE id=%s", (42,)))


if __name__ == "__main__":
    unittest.main()
