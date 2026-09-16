import unittest
import subprocess
import sys
from pathlib import Path

from scripts.seed_req12_ml_fixture import (
    GAPS,
    NODE_SPECS,
    PROCESS_CODE,
    RESOURCE_CODES,
    TRANSITIONS,
    CANONICAL_LOAD_PROCESS_ID,
    DEPRECATION_MESSAGE,
    contract_snapshot,
    load,
)


class Req12MlFixtureContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.document = (
            Path(__file__).parents[2]
            / "requeriments_spec_driven_development"
            / "requerimiento_12"
            / "proceso_ML_estructurado.md"
        ).read_text(encoding="utf-8")

    def test_contract_is_generic_and_deterministic(self):
        snapshot = contract_snapshot()
        self.assertEqual(snapshot["process_code"], PROCESS_CODE)
        self.assertEqual(snapshot["counts"]["nodes"], 12)
        self.assertEqual(snapshot["counts"]["transitions"], 17)
        self.assertEqual(snapshot["counts"]["resources"], 26)
        self.assertEqual(snapshot["counts"]["gaps"], len(GAPS))
        self.assertNotIn("ml_", " ".join(snapshot["generic_tables"]))
        self.assertIn("pm_process_node_metadata", snapshot["generic_tables"])
        self.assertIn("pm_context_record", snapshot["generic_tables"])

    def test_structured_document_vocabulary_is_loaded_by_generic_projection(self):
        for code, *_ in NODE_SPECS:
            self.assertIn(f"`{code}`", self.document)
        for transition_id, *_ in TRANSITIONS:
            self.assertIn(f"`{transition_id}`", self.document)
        for resource in RESOURCE_CODES:
            self.assertIn(resource, self.document)

    def test_gaps_distinguish_metadata_from_missing_operational_facts(self):
        gap_ids = {gap["id"] for gap in GAPS}
        self.assertTrue({"ML-N-001", "ML-N-009", "ML-N-010"}.issubset(gap_ids))
        snapshot = contract_snapshot()
        self.assertIn("persisted_as_metadata_or_projection", snapshot)
        self.assertIn("declarations, one execution fact and one fixture evidence record",
                      snapshot["persisted_as_metadata_or_projection"])

    def test_mutating_loader_is_disabled_after_canonical_consolidation(self):
        with self.assertRaisesRegex(RuntimeError, "consolidado y eliminado"):
            load(None)
        self.assertEqual(CANONICAL_LOAD_PROCESS_ID, "f247eee0-cfa1-4ea5-b4e6-fa4598a061b5")
        self.assertIn("sólo --contract", DEPRECATION_MESSAGE)

    def test_cli_rejects_every_database_mode_before_connecting(self):
        for arguments in ([], ["--dry-run"], ["--json"], ["--dry-run", "--json"]):
            result = subprocess.run(
                [sys.executable, str(Path(__file__).parents[2] / "scripts" / "seed_req12_ml_fixture.py"), *arguments],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("Carga ML deprecada", result.stderr)


if __name__ == "__main__":
    unittest.main()
