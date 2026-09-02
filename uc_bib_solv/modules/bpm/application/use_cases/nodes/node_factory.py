"""Shared construction helpers for BPM process nodes."""

from uc_bib_solv.modules.bpm.application.dto.commands import NodeCommand
from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages
from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessNode
from uc_bib_solv.modules.bpm.domain.processes.rules import next_node_code


def build_process_node(process_id, process, data):
    """Build a canonical node entity from an API-facing node payload."""
    node_data = NodeCommand.from_payload(data).to_dict()
    node_data["node_code"] = next_node_code(process.get("nodes", []), node_data.get("node_type"))
    if "etapas" in data:
        node_data.setdefault("properties", {})["etapas"] = canonical_stages(data["etapas"], envelope=True)
    if "stock" in data:
        node_data.setdefault("properties", {})["stock"] = data["stock"]
    return ProcessNode(process_id=process_id, **node_data)
