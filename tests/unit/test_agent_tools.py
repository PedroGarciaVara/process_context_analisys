import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2] / "uc_bib_solv"))

from uc_bib_solv.agent_tools import ToolRequest, ToolRegistry, build_default_registry
from uc_bib_solv.agent_tools.errors import AgentToolError


class FakeGateway:
    def process_catalog(self): return [{"process_id": "p1"}]
    def process(self, process_id): return {"process_id": process_id}
    def version(self, version_id, expand_node_id=None): return {"version_id": version_id, "expand_node_id": expand_node_id}
    def context(self, version_id, node_id=None, family=None, record_type=None): return {"version_id": version_id, "records": []}
    def tree(self, view, contract_id=None): return {"view": view, "contract_id": contract_id}
    def machine_context(self, machine_id): return {"machine_id": machine_id}
    def contracts(self, process_id=None): return [{"process_id": process_id}]
    def calculate_kpi(self, payload): return {"value": 2, "source": payload["source"]}


def test_manifest_is_deterministic_and_complete():
    names = [item["name"] for item in build_default_registry(FakeGateway()).manifest()]
    assert names == sorted(names)
    assert {"bpm.version", "causal.tree", "machine.context", "context.get"} <= set(names)


def test_invocation_adds_trace_without_changing_domain_payload():
    result = build_default_registry(FakeGateway()).invoke("bpm.version", ToolRequest({"version_id": "v1"}, actor="test"))
    assert result.data["version_id"] == "v1"
    assert result.context.tool_name == "bpm.version"
    assert result.context.actor == "test"


def test_required_arguments_are_rejected_before_gateway():
    try:
        build_default_registry(FakeGateway()).invoke("process.get")
    except AgentToolError as exc:
        assert exc.code == "required_argument"
    else:
        raise AssertionError("missing process_id should fail")
