import unittest

from uc_bib_solv.modules.bpm.adapters.outbound.postgres.maquina_repo import _db_json_value


class MachineRepoJsonNullTest(unittest.TestCase):
    def test_none_remains_sql_null_instead_of_json_null(self):
        self.assertIsNone(_db_json_value(None))

    def test_structured_values_are_adapted_as_json(self):
        self.assertIn('"value"', _db_json_value({"value": 1}).getquoted().decode())


if __name__ == "__main__":
    unittest.main()
