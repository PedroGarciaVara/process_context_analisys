"""Regression tests for the explicit BPM/RCA_TREE modular boundary."""

from __future__ import annotations

import ast
import unittest
from pathlib import Path

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app


ROOT = Path(__file__).resolve().parents[2]
MODULES = ROOT / "uc_bib_solv" / "modules"


class ExplicitDomainArchitectureTests(unittest.TestCase):
    def test_legacy_directories_are_physically_absent(self):
        legacy = (
            MODULES.parent / "app",
            MODULES / "causal_tree",
            MODULES / "causal_analysis",
            MODULES / "operational_modeling",
            MODULES / "process_modeling",
            MODULES / "bpm" / "process_modeling",
            MODULES.parent / "routes",
            MODULES.parent / "services",
            MODULES.parent / "repositories",
        )
        for path in legacy:
            self.assertFalse(path.exists(), f"legacy path remains: {path}")
        self.assertEqual({path.name for path in MODULES.iterdir() if path.is_dir()}, {"bpm", "platform", "rca_tree"})

    def test_bpm_and_rca_tree_have_clean_architecture_layers(self):
        for context in ("bpm", "rca_tree"):
            with self.subTest(context=context):
                for layer in ("domain", "application", "adapters", "infrastructure"):
                    self.assertTrue((MODULES / context / layer).is_dir(), f"missing {context}/{layer}")

    def test_bpm_domain_has_no_flat_compatibility_artifacts(self):
        domain = MODULES / "bpm" / "domain"
        deprecated_files = (
            domain / "entities.py",
            domain / "validators.py",
            domain / "value_objects.py",
            domain / "exceptions.py",
        )
        for path in deprecated_files:
            self.assertFalse(path.exists(), f"deprecated BPM domain file remains: {path}")
        machine_modeling = domain / "machine_modeling"
        self.assertFalse(
            machine_modeling.exists() and any(machine_modeling.glob("*.py")),
            "deprecated machine_modeling source remains",
        )

    def test_domain_modules_are_framework_free_and_do_not_cross_import(self):
        forbidden = ("flask", "psycopg", "app.persistence", "repositories", "routes", "services")
        for context in ("bpm", "rca_tree"):
            for path in (MODULES / context / "domain").rglob("*.py"):
                tree = ast.parse(path.read_text(encoding="utf-8"))
                for node in ast.walk(tree):
                    if not isinstance(node, (ast.Import, ast.ImportFrom)):
                        continue
                    if isinstance(node, ast.Import):
                        target = ",".join(alias.name for alias in node.names)
                    else:
                        target = node.module or ""
                    normalized = target.lower()
                    self.assertFalse(any(word in normalized for word in forbidden), f"{path}: {target}")
                    self.assertFalse("modules.bpm" in normalized and context != "bpm", f"cross import: {path}: {target}")
                    self.assertFalse("modules.rca_tree" in normalized and context != "rca_tree", f"cross import: {path}: {target}")

    def test_canonical_http_contracts_are_composed(self):
        rules = {rule.rule for rule in create_app().url_map.iter_rules()}
        expected = {
            "/api/bpm/processes",
            "/api/bpm/operational/catalog",
            "/api/bpm/contracts",
            "/api/bpm/machines",
            "/api/rca-tree/nodes",
            "/api/rca-tree/analyses",
        }
        self.assertTrue(expected.issubset(rules))

    def test_rca_tree_analysis_adapter_is_canonical(self):
        adapter = MODULES / "rca_tree" / "adapters" / "outbound" / "analysis_postgres.py"
        source = adapter.read_text(encoding="utf-8")
        self.assertNotIn("causal_analysis", source)
        self.assertNotIn("db_cursor", source)


if __name__ == "__main__":
    unittest.main()
