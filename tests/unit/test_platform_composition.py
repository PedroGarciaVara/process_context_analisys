import unittest

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app


class PlatformCompositionTests(unittest.TestCase):
    def test_runtime_registers_process_modeling_from_canonical_adapter(self):
        app = create_app()
        process_routes = {
            (rule.rule, method)
            for rule in app.url_map.iter_rules()
            if rule.rule.startswith("/api/process-modeling/")
            for method in rule.methods - {"HEAD", "OPTIONS"}
        }
        self.assertIn(("/api/process-modeling/processes", "GET"), process_routes)
        self.assertIn(("/api/process-modeling/nodes/<node_id>", "PATCH"), process_routes)


if __name__ == "__main__":
    unittest.main()
