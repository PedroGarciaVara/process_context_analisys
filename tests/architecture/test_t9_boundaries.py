"""T9 regression checks for public boundaries and validator enforcement."""

from __future__ import annotations

import hashlib
import subprocess
import sys
import unittest
from pathlib import Path

from uc_bib_solv.architecture_validators.allowlist import ALLOWLIST


ROOT = Path(__file__).resolve().parents[2]


class T9BoundaryTests(unittest.TestCase):
    def test_all_validator_commands_are_green(self):
        for flag in (
            "--check-structure",
            "--check-naming",
            "--check-dependencies",
            "--check-concrete-implementations",
        ):
            with self.subTest(flag=flag):
                result = subprocess.run(
                    [sys.executable, "-m", "uc_bib_solv.architecture_validators", flag],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_allowlist_entries_have_retirement_metadata(self):
        self.assertTrue(ALLOWLIST)
        for entry in ALLOWLIST:
            with self.subTest(pattern=entry.pattern):
                self.assertTrue(entry.owner)
                self.assertTrue(entry.phase)
                self.assertTrue(entry.removal_criterion)

    def test_schema_is_not_modified_by_t9(self):
        schema = ROOT / "db_management" / "schema.sql"
        self.assertEqual(
            hashlib.sha256(schema.read_bytes()).hexdigest(),
            # Baseline of the current intentional db_management schema.
            "d1369faf65176a6078260a88e6b210e1442b53b709baaec0adc24c82560b3a59",
        )

    def test_http_alias_registry_has_been_removed(self):
        from uc_bib_solv.architecture_validators import allowlist

        self.assertFalse(hasattr(allowlist, "HTTP_ROUTE_ALIASES"))


if __name__ == "__main__":
    unittest.main()
