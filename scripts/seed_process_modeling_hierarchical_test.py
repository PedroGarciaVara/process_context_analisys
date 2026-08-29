"""Seed the reproducible hierarchical process-modeling fixture.

The fixture uses the canonical BPM model: every graph belongs directly to a
``process_id``. Re-running it updates deterministic records and never creates
process versions.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from uuid import UUID, uuid5

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.bpm.adapters.outbound.postgres.pm_process_repo import (  # noqa: E402
    NodeRepository, ProcessRepository, TransitionRepository,
)

PARENT_CODE = "TEST_PM_UI_1784458754642"
CHILD_CODE = "TEST_PM_UI_CHILD_1784458754642"
OP2_CHILD_CODE = "TEST_PM_UI_OP2_CHILD_1784458754642"
OP3_CHILD_CODE = "TEST_PM_UI_OP3_CHILD_1784458754642"
OP1_1_CHILD_CODE = "TEST_PM_UI_OP1_1_CHILD_1784458754642"
PARENT_PROCESS_ID = "26431463-6b5a-401a-b7bb-b3b5273d2a19"
PARENT_NODE_ID = "0facf9e9-2a28-448e-8b36-9a980e152544"
NAMESPACE = UUID("7f3e1487-0e66-4db0-95f4-6c758a58d9a7")


def stable_id(label: str) -> str:
    return str(uuid5(NAMESPACE, label))


def operation_description(code: str, name: str) -> str:
    return f"{code}: {name}. Descripción operativa del proceso de prueba."


def node_description(node_type: str, code: str, name: str) -> str | None:
    return operation_description(code, name) if node_type in {"operation", "subprocess"} else None


def find_process(process_repo: ProcessRepository, code: str) -> dict | None:
    return next((item for item in process_repo.list() if item.get("process_code") == code), None)


def ensure_process(process_repo: ProcessRepository, code: str, name: str, process_id: str, parent_process_id: str | None = None) -> dict:
    existing = find_process(process_repo, code)
    if existing:
        changes = {"parent_process_id": parent_process_id} if parent_process_id and str(existing.get("parent_process_id")) != str(parent_process_id) else {}
        return process_repo.update(existing["process_id"], changes) if changes else existing
    return process_repo.create({"process_id": process_id, "process_code": code, "name": name,
        "description": "Fixture jerárquico reproducible para modelado de procesos", "abstraction_level": 0,
        "parent_process_id": parent_process_id, "status": "draft"})


def ensure_node(node_repo: NodeRepository, process: dict, data: dict) -> dict:
    current = next((node for node in process.get("nodes", []) if node["node_code"] == data["node_code"]), None)
    if current:
        changes = {key: value for key, value in data.items() if current.get(key) != value}
        return node_repo.update(current["node_id"], changes) if changes else current
    return node_repo.create(process["process_id"], data)


def ensure_transition(transition_repo: TransitionRepository, process: dict, source: dict, target: dict, transition_type: str, label: str | None = None) -> dict:
    existing = next((item for item in process.get("transitions", []) if item["source_node_id"] == source["node_id"] and item["target_node_id"] == target["node_id"] and item["transition_type"] == transition_type), None)
    if existing:
        return existing
    return transition_repo.create(process["process_id"], {"transition_id": stable_id(f"{process['process_id']}:{source['node_code']}:{target['node_code']}:{transition_type}"), "source_node_id": source["node_id"], "target_node_id": target["node_id"], "transition_type": transition_type, "label": label, "properties": {"fixture": True}})


def ensure_simple_flow(process_repo, node_repo, transition_repo, process: dict, label: str) -> dict:
    process = process_repo.get(process["process_id"]) or process
    nodes = {}
    for code, node_type, name in (("INPUT", "input", f"Entrada {label}"), ("OUTPUT", "output", f"Salida {label}")):
        nodes[code] = ensure_node(node_repo, process, {"node_id": stable_id(f"{process['process_id']}:node:{code}"), "node_code": code, "node_type": node_type, "name": name, "description": node_description(node_type, code, name), "output_role": "normal" if node_type == "output" else None, "properties": {"fixture": True}})
    ensure_transition(transition_repo, process, nodes["INPUT"], nodes["OUTPUT"], "sequence")
    return process_repo.get(process["process_id"]) or process


def ensure_simple_child(process_repo, node_repo, transition_repo, code: str, name: str, parent_id: str | None = None) -> dict:
    process = ensure_process(process_repo, code, name, stable_id(f"process:{code}"), parent_id)
    return ensure_simple_flow(process_repo, node_repo, transition_repo, process, code)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="imprime los IDs resultantes como JSON")
    args = parser.parse_args()
    processes, nodes, transitions = ProcessRepository(), NodeRepository(), TransitionRepository()
    parent = processes.get(PARENT_PROCESS_ID)
    if parent and parent.get("process_code") != PARENT_CODE:
        raise RuntimeError(f"El proceso exacto no coincide con {PARENT_PROCESS_ID}/{PARENT_CODE}")
    parent = parent or ensure_process(processes, PARENT_CODE, "Proceso padre TEST_PM_UI", PARENT_PROCESS_ID)
    parent = processes.get(PARENT_PROCESS_ID) or parent
    child = ensure_simple_child(processes, nodes, transitions, CHILD_CODE, "Proceso hijo TEST_PM_UI", PARENT_PROCESS_ID)
    op2 = ensure_simple_child(processes, nodes, transitions, OP2_CHILD_CODE, "Subproceso de Operación 2", PARENT_PROCESS_ID)
    op3 = ensure_simple_child(processes, nodes, transitions, OP3_CHILD_CODE, "Subproceso de Operación 3", PARENT_PROCESS_ID)
    nested = ensure_simple_child(processes, nodes, transitions, OP1_1_CHILD_CODE, "Subproceso de Operación 1.1", child["process_id"])
    parent = processes.get(PARENT_PROCESS_ID) or parent
    parent_node = next((node for node in parent["nodes"] if str(node["node_id"]) == PARENT_NODE_ID), None)
    if not parent_node:
        parent_node = nodes.create(PARENT_PROCESS_ID, {"node_id": PARENT_NODE_ID, "node_code": "OP1", "node_type": "operation", "name": "Operación 1", "description": operation_description("OP1", "Operación 1"), "properties": {"fixture": True}})
    parent_node = nodes.update(parent_node["node_id"], {"node_type": "subprocess", "child_process_id": child["process_id"], "description": operation_description("OP1", "Operación 1")})
    result = {"parent_process_id": str(parent["process_id"]), "parent_node_id": str(parent_node["node_id"]), "child_process_id": str(child["process_id"]), "op2_child_process_id": str(op2["process_id"]), "op3_child_process_id": str(op3["process_id"]), "nested_op1_1_child_process_id": str(nested["process_id"])}
    print(json.dumps(result, ensure_ascii=False, indent=2) if args.json else "Seed OK\n" + json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
