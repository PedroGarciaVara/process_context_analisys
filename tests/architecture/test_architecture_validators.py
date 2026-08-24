from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from uc_bib_solv.architecture_validators.runner import Diagnostic, run_checks


FIXTURES = Path(__file__).parent / "fixtures"


def cli(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "uc_bib_solv.architecture_validators", *args, "--root", str(root)],
        text=True,
        capture_output=True,
        check=False,
    )


def test_valid_fixture_passes_every_check_and_is_repeatable():
    root = FIXTURES / "valid_project"
    first = run_checks(root, ("structure", "naming", "dependencies", "concrete_implementations"))
    second = run_checks(root, ("structure", "naming", "dependencies", "concrete_implementations"))
    assert first == second == []


def test_structure_reports_missing_directory_with_exit_one():
    result = cli(FIXTURES / "invalid_structure", "--check-structure")
    assert result.returncode == 1
    assert "mandatory directory is missing" in result.stdout
    assert "structure" in result.stdout
    assert ":1 | structure |" in result.stdout


def test_naming_reports_invalid_fixture_but_legacy_allowlist_is_not_scanned():
    result = cli(FIXTURES / "invalid_naming", "--check-naming")
    assert result.returncode == 1
    assert "Python module must use snake_case" in result.stdout
    assert "routes/LegacyRoute.py" not in result.stdout
    assert ":1 | naming | path -> bad-name.py" in result.stdout


def test_naming_allowlist_is_applied_to_legacy_function_diagnostics():
    result = cli(FIXTURES / "invalid_naming", "--check-naming")
    assert result.returncode == 1
    assert "routes/LegacyRoute.py" not in result.stdout
    assert "LegacyFunction" not in result.stdout


def test_dependencies_reports_ast_line_and_source_target():
    result = cli(FIXTURES / "invalid_dependencies", "--check-dependencies")
    assert result.returncode == 1
    assert "domain-isolation" in result.stdout
    assert "psycopg2" in result.stdout
    assert "->" in result.stdout
    assert ":1 |" in result.stdout


def test_cross_domain_internal_import_is_rejected():
    result = cli(FIXTURES / "invalid_cross_domain", "--check-dependencies")
    assert result.returncode == 1
    assert "domain-dependency" in result.stdout


def test_concrete_construction_and_duplicate_outbound_are_rejected():
    result = cli(FIXTURES / "invalid_concrete", "--check-concrete-implementations")
    assert result.returncode == 1
    assert "concrete-implementation" in result.stdout
    assert "duplicate-implementation" in result.stdout
    duplicate_lines = [line for line in result.stdout.splitlines() if "duplicate-implementation" in line]
    assert duplicate_lines
    assert all(":1 | duplicate-implementation |" in line for line in duplicate_lines)


def test_all_diagnostics_have_explicit_contract_fields_and_positive_lines():
    result = cli(FIXTURES / "invalid_combined")
    assert result.returncode == 1
    for line in result.stdout.splitlines():
        location, rule, relation, message = [part.strip() for part in line.split("|", 3)]
        file_name, line_number = location.rsplit(":", 1)
        origin, target = [part.strip() for part in relation.split("->", 1)]
        assert file_name
        assert int(line_number) > 0
        assert rule
        assert origin
        assert target
        assert message


def test_allowlist_is_not_applied_under_modules():
    rel = "uc_bib_solv/modules/catalog/domain/legacy.py"
    from uc_bib_solv.architecture_validators.runner import _allowlisted

    assert _allowlisted("uc_bib_solv/routes/LegacyRoute.py")
    assert not _allowlisted(rel)


def test_diagnostic_render_keeps_explicit_zero_line():
    diagnostic = Diagnostic("fixture.py", 0, "rule", "origin", "target", "message")

    assert diagnostic.render() == "fixture.py:0 | rule | origin -> target | message"


def test_combined_mode_has_stable_sorted_diagnostics():
    result = cli(FIXTURES / "invalid_combined")
    assert result.returncode == 1
    lines = result.stdout.splitlines()
    assert lines == sorted(lines)
    assert "structure" in result.stdout
    assert "naming" in result.stdout
    assert "domain-isolation" in result.stdout
