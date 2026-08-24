from __future__ import annotations

from pathlib import Path

from scripts.audit_application_architecture import inventory


def test_frontend_routes_have_renderers():
    gap = inventory()["frontend"]["route_renderer_gap"]
    assert gap["routes_without_renderers"] == []
    assert gap["renderers_without_routes"] == []
    assert gap["menu_routes_without_routes"] == []


def test_audit_keeps_legacy_candidates_explicit():
    candidates = inventory()["frontend"]["legacy_candidates"]
    assert "procesos" in candidates
    assert "causa_detalle" in candidates


def test_backend_duplicate_report_is_available():
    backend = inventory()["backend"]
    assert backend["unique_endpoint_count"] > 0
    assert isinstance(backend["duplicate_endpoint_definitions"], dict)


def test_backend_inventory_contains_composition_and_consumer_classification():
    backend = inventory()["backend"]
    assert backend["runtime"]["available"] is True
    assert backend["runtime"]["routes"]
    assert backend["modules"]
    assert backend["functions"]
    assert backend["inbound_adapters"]
    assert backend["dynamic_imports"]
    assert "classification_counts" in backend


def test_backend_audit_marks_unregistered_adapters_without_deleting_them():
    backend = inventory()["backend"]
    unregistered = {
        item["file"]
        for item in backend["inbound_adapters"]
        if not item["registered_at_runtime"]
    }
    assert "uc_bib_solv/modules/rca_tree/adapters/inbound/http/causas_compat.py" not in unregistered


def test_backend_check_rejects_parse_or_composition_failures_only():
    backend = inventory()["backend"]
    assert backend["parse_errors"] == []
    assert backend["runtime"]["available"] is True


def test_backend_ownership_keeps_operational_bpm_and_causal_tree_separate():
    ownership = {item["file"]: item["domain"] for item in inventory()["backend"]["ownership"]}
    assert ownership["uc_bib_solv/modules/bpm/adapters/outbound/postgres/contrato_repo.py"] == "BPM"
    assert ownership["uc_bib_solv/modules/bpm/adapters/outbound/postgres/maquina_repo.py"] == "BPM"
    assert ownership["uc_bib_solv/modules/rca_tree/adapters/outbound/postgres/node_repo.py"] == "TREE"
    assert ownership["uc_bib_solv/modules/rca_tree/application/use_cases/analyses/create_analysis.py"] == "TREE"


def test_runtime_composition_uses_canonical_bpm_operational_adapter():
    runtime = inventory()["backend"]["runtime"]["routes"]
    operational = [item for item in runtime if item["path"].startswith("/api/operational/")]
    assert operational
    assert {item["module"] for item in operational} == {
        "uc_bib_solv.modules.bpm.adapters.inbound.http.operational_compat"
    }


def test_runtime_composition_uses_canonical_tree_and_analysis_adapters():
    runtime = inventory()["backend"]["runtime"]["routes"]
    tree = [item for item in runtime if item["path"].startswith("/api/causas") or item["path"] == "/causas"]
    analysis = [item for item in runtime if item["path"].startswith("/api/analys")]
    assert tree and analysis
    assert {item["module"] for item in tree} == {
        "uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat"
    }
    assert {item["module"] for item in analysis} == {
        "uc_bib_solv.modules.rca_tree.adapters.inbound.http.analysis_compat"
    }


def test_legacy_analysis_facade_composes_rca_tree_service():
    from pathlib import Path

    source = Path("uc_bib_solv/modules/rca_tree/adapters/inbound/http/analysis_compat.py").read_text(encoding="utf-8")
    assert "modules.causal_analysis" not in source
    assert "build_rca_tree_analysis_service" in source


def test_legacy_analysis_consumers_use_rca_tree_persistence():
    from pathlib import Path

    for relative in (
        "uc_bib_solv/modules/rca_tree/infrastructure/analysis_compat.py",
        "uc_bib_solv/modules/rca_tree/adapters/outbound/postgres/analisis_causas_repo.py",
        "uc_bib_solv/modules/rca_tree/adapters/outbound/postgres/analisis_causas_detalle_repo.py",
        "uc_bib_solv/modules/rca_tree/domain/analysis_entities.py",
    ):
        source = Path(relative).read_text(encoding="utf-8")
        assert "modules.causal_analysis" not in source


def test_product_code_does_not_import_top_level_legacy_namespaces():
    import ast

    root = Path("uc_bib_solv")
    forbidden = {"app", "modules", "repositories", "routes", "services"}
    violations = []
    for path in root.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                names = [alias.name.split(".", 1)[0] for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.level == 0:
                names = [(node.module or "").split(".", 1)[0]]
            else:
                continue
            if forbidden.intersection(names):
                violations.append(str(path))
    assert violations == []


def test_canonical_runtime_preserves_legacy_route_contracts():
    from flask import Flask
    from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app
    from uc_bib_solv.modules.rca_tree.adapters.inbound.http.analysis_compat import bp as legacy_analysis
    from uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat import bp as legacy_tree
    from uc_bib_solv.modules.bpm.adapters.inbound.http.operational_compat import bp as legacy_operational

    def blueprint_paths(blueprint):
        app = Flask(__name__)
        app.register_blueprint(blueprint)
        return {
            (rule.rule, method)
            for rule in app.url_map.iter_rules()
            for method in rule.methods - {"HEAD", "OPTIONS"}
        }

    runtime = create_app().url_map
    runtime_paths = {
        (rule.rule, method)
        for rule in runtime.iter_rules()
        for method in rule.methods - {"HEAD", "OPTIONS"}
    }
    for legacy in (legacy_operational, legacy_tree, legacy_analysis):
        assert blueprint_paths(legacy) <= runtime_paths
