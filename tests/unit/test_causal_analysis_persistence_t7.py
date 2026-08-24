import unittest
from contextlib import contextmanager
from unittest.mock import patch

from uc_bib_solv.modules.rca_tree.adapters.outbound.analysis_postgres import RcaTreeAnalysisPostgresAdapter


class FakeCursor:
    def __init__(self): self.calls = []; self.rows = [{"id": 4, "analisis_id": 9}]
    def execute(self, sql, params=()): self.calls.append((sql, params))
    def fetchall(self): return self.rows


class CausalAnalysisPersistenceT7Tests(unittest.TestCase):
    def test_result_read_uses_one_canonical_query(self):
        cursor = FakeCursor()

        @contextmanager
        def fake_db_cursor():
            yield cursor

        transaction = type("Transaction", (), {"cursor": staticmethod(fake_db_cursor)})()
        result = RcaTreeAnalysisPostgresAdapter(transaction).list_results(9)

        self.assertEqual(result, [{"id": 4, "analisis_id": 9}])
        self.assertEqual(len(cursor.calls), 1)
        self.assertIn("ANALISIS_RESULTADO", cursor.calls[0][0].upper())
