import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "consolidate_duplicate_ml_process.py"
SPEC = importlib.util.spec_from_file_location("consolidate_duplicate_ml_process", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ConsolidationContractTest(unittest.TestCase):
    def test_migration_targets_only_canonical_load_dosage_scope(self):
        self.assertEqual(MODULE.SOURCE_PROCESS_ID, "d320e817-5601-5fe4-937a-cefda5b5dd48")
        self.assertEqual(MODULE.TARGET_PROCESS_ID, "f247eee0-cfa1-4ea5-b4e6-fa4598a061b5")
        self.assertEqual(MODULE.SOURCE_OPERATION_ID, "9a8b4bed-6cf2-56a7-8457-b2d5ddf0bfff")
        self.assertEqual(MODULE.TARGET_CONTRACT_ID, 99)
        self.assertEqual(MODULE.BN_MACHINE_NAMES, ("BN11", "BN12", "BN21", "BN22", "BN31", "BN32", "BN41", "BN42"))

    def test_metadata_merge_removes_unrelated_fixture_questions_and_keeps_json_shape(self):
        result = MODULE._merge_operation_metadata({
            "data": {"open_questions": ["ML-N-001"], "description": "original"},
            "provenance": {"seed": "R12_ML_FIXTURE_V1"},
        })

        self.assertEqual(result["family"], "industrial_process")
        self.assertEqual(result["context_id"], MODULE.SOURCE_OPERATION_ID)
        self.assertNotIn("open_questions", result["data"])
        self.assertEqual(result["data"]["equipment"], list(MODULE.BN_MACHINE_NAMES))
        self.assertEqual(result["data"]["canonical_ids"]["contrato_id"], 99)
        self.assertEqual(result["data"]["canonical_ids"]["proceso_id"], 65)
        self.assertNotIn("contract_id", result["data"]["canonical_ids"])
        self.assertEqual(result["source"]["reference"], MODULE.SOURCE_DOCUMENT)
        self.assertEqual(result["provenance"]["copied_from_process_id"], MODULE.SOURCE_PROCESS_ID)

    def test_adapters_keep_english_api_aliases_compatible_with_spanish_storage_keys(self):
        root = Path(__file__).resolve().parents[2]
        process_repo = (root / "uc_bib_solv/modules/bpm/adapters/outbound/postgres/pm_process_repo.py").read_text(encoding="utf-8")
        operational_repo = (root / "uc_bib_solv/modules/bpm/adapters/outbound/postgres/operational_repository.py").read_text(encoding="utf-8")
        studio = (root / "uc_bib_solv/webapp/js/bpm-studio.js").read_text(encoding="utf-8")

        self.assertIn('.get("proceso_id")', process_repo)
        self.assertIn('.get("process_id")', process_repo)
        self.assertIn('ids.get("contrato_id", ids.get("contract_id"))', operational_repo)
        self.assertIn("canonical.contract_id ?? canonical.contrato_id", studio)


if __name__ == "__main__":
    unittest.main()
