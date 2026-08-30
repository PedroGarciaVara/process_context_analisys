from __future__ import annotations

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app


def test_canonical_rca_tree_routes_are_registered_without_legacy_aliases():
    app = create_app()
    routes = {rule.rule for rule in app.url_map.iter_rules()}

    assert "/api/rca-tree/causes" in routes
    assert "/api/rca-tree/causes/detail" in routes
    assert "/api/rca-tree/hypotheses/<int:hypothesis_id>" in routes
    assert "/api/rca-tree/nodes" in routes
    assert "/api/rca-tree/tree" not in routes
    assert "/api/causas" not in routes
    assert "/api/hipotesis/<int:hipotesis_id>" not in routes


def test_legacy_cause_paths_are_not_registered_in_flask():
    client = create_app().test_client()

    for path in ("/api/causas", "/api/causas/61", "/api/hipotesis/91", "/api/rca-tree/tree"):
        assert client.get(path).status_code == 404
