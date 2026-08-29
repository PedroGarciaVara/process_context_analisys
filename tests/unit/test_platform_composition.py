import unittest
from unittest.mock import Mock

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app
from uc_bib_solv.modules.platform.adapters.bpm_contract_context import BpmContractContextAdapter


class PlatformCompositionTests(unittest.TestCase):
    @staticmethod
    def _runtime_routes(app):
        return [
            (method, rule.rule, rule.endpoint)
            for rule in app.url_map.iter_rules()
            for method in sorted(rule.methods - {"HEAD", "OPTIONS"})
        ]

    def test_runtime_has_no_method_path_collisions(self):
        app = create_app()
        routes = self._runtime_routes(app)
        keys = [(method, path) for method, path, _ in routes]
        self.assertEqual(len(keys), len(set(keys)))

    def test_only_canonical_api_routes_are_registered(self):
        app = create_app()
        routes = {(method, path) for method, path, _ in self._runtime_routes(app)}
        for route in (
            ("GET", "/api/bpm/processes"),
            ("GET", "/api/bpm/operations"),
            ("GET", "/api/rca-tree/nodes"),
            ("GET", "/api/rca-tree/analyses"),
            ("GET", "/api/bpm/operational/processes"),
            ("GET", "/api/bpm/processes"),
            ("GET", "/api/rca-tree/causes/<int:cause_id>"),
            ("GET", "/api/rca-tree/analyses"),
        ):
            self.assertIn(route, routes)
        for legacy in ("/api/operational/", "/api/process-modeling/", "/api/causas", "/api/hipotesis/", "/api/analyses", "/api/analysis-templates"):
            self.assertFalse(any(path.startswith(legacy) for _, path, _ in self._runtime_routes(app)))

    def test_each_registered_blueprint_endpoint_has_one_runtime_owner(self):
        app = create_app()
        endpoints = {}
        for method, path, endpoint in self._runtime_routes(app):
            endpoints.setdefault((method, path), set()).add(endpoint)
        self.assertTrue(all(len(owners) == 1 for owners in endpoints.values()))

    def test_contract_context_bridge_delegates_to_narrow_bpm_port(self):
        port = Mock()
        port.get_by_id.return_value = {"id": 7}
        port.get_all.return_value = [{"id": 7}]
        port.create.return_value = {"id": 8}
        bridge = BpmContractContextAdapter(port)

        self.assertEqual({"id": 7}, bridge.get_contract("7"))
        self.assertEqual([{"id": 7}], bridge.list_contracts())
        self.assertEqual({"id": 8}, bridge.create_contract(3, "Nuevo", "OEE", "<150"))
        port.get_by_id.assert_called_once_with(7)
        port.get_all.assert_called_once_with()
        port.create.assert_called_once_with(3, "Nuevo", "OEE", "<150", None, None)

    def test_runtime_registers_process_modeling_from_canonical_adapter(self):
        app = create_app()
        process_routes = {
            (rule.rule, method)
            for rule in app.url_map.iter_rules()
            if rule.rule.startswith("/api/bpm/")
            for method in rule.methods - {"HEAD", "OPTIONS"}
        }
        self.assertIn(("/api/bpm/processes", "GET"), process_routes)
        self.assertIn(("/api/bpm/nodes/<node_id>", "PATCH"), process_routes)


if __name__ == "__main__":
    unittest.main()
