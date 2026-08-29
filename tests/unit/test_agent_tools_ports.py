import unittest

from uc_bib_solv.modules.platform.adapters.agent_tools import ToolRequest, ToolResult, build_default_registry
from uc_bib_solv.modules.platform.adapters.agent_tools.domain.errors import AgentToolError
from uc_bib_solv.modules.platform.adapters.agent_tools.domain.validation import object_args


class FakeGateway:
    def __init__(self):
        self.calls = []

    def process_catalog(self): self.calls.append("process_catalog"); return [{"process_id": "p1"}]
    def process(self, process_id): self.calls.append(("process", process_id)); return {"process_id": process_id}
    def version(self, version_id, expand_node_id=None): return {"version_id": version_id, "expand_node_id": expand_node_id}
    def context(self, version_id, node_id=None, family=None, record_type=None): return {"version_id": version_id, "records": []}
    def tree(self, view, contract_id=None): return {"view": view, "contract_id": contract_id}
    def machine_context(self, machine_id): return {"machine_id": machine_id}
    def contracts(self, process_id=None): return [{"process_id": process_id}]
    def calculate_kpi(self, payload): return {"value": 2, "source": payload["source"]}


class AgentToolsPortsTest(unittest.TestCase):
    def test_public_contracts_are_exposed_from_canonical_boundary(self):
        request = ToolRequest({"version_id": "v1"}, actor="tester", trace_id="trace-1")
        self.assertEqual(ToolResult({"ok": True}, request), ToolResult({"ok": True}, request))
        self.assertEqual(request.trace_id, "trace-1")

    def test_validation_rejects_non_object_arguments(self):
        with self.assertRaises(AgentToolError) as caught:
            object_args(["not", "an", "object"])
        self.assertEqual(caught.exception.code, "invalid_arguments")

    def test_fake_gateway_integration_preserves_names_codes_and_trace(self):
        fake = FakeGateway()
        registry = build_default_registry(fake)
        result = registry.invoke("process.get", ToolRequest({"process_id": "p1"}, actor="agent", trace_id="trace-15"))
        self.assertEqual(result.data, {"process_id": "p1"})
        self.assertEqual(result.to_dict()["trace"], {"trace_id": "trace-15", "source": "agent_tools", "tool": "process.get", "actor": "agent"})
        self.assertEqual(fake.calls, [("process", "p1")])


if __name__ == "__main__":
    unittest.main()
