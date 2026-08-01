"""Seed the real PostgreSQL process-modeling fixture used by the focused UI test.

The script is deliberately scoped to the two TEST_PM_UI_ prefixes named below.
It is safe to run repeatedly: existing records are resolved by their stable
codes/IDs and only the requested parent node, child nodes, and child transitions
are updated or created.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from uuid import UUID, uuid5

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.persistence.db import db_cursor  # noqa: E402
from app.persistence.pm_process_repo import (  # noqa: E402
    NodeRepository,
    ProcessRepository,
    TransitionRepository,
    VersionRepository,
)


PARENT_CODE = "TEST_PM_UI_1784458754642"
CHILD_CODE = "TEST_PM_UI_CHILD_1784458754642"
OP2_CHILD_CODE = "TEST_PM_UI_OP2_CHILD_1784458754642"
OP3_CHILD_CODE = "TEST_PM_UI_OP3_CHILD_1784458754642"
OP1_1_CHILD_CODE = "TEST_PM_UI_OP1_1_CHILD_1784458754642"
PARENT_PROCESS_ID = "26431463-6b5a-401a-b7bb-b3b5273d2a19"
PARENT_VERSION_ID = "184a8efe-29dd-4eac-877f-cb69fbc25774"
PARENT_NODE_ID = "0facf9e9-2a28-448e-8b36-9a980e152544"
NAMESPACE = UUID("7f3e1487-0e66-4db0-95f4-6c758a58d9a7")


def stable_id(label: str) -> str:
    return str(uuid5(NAMESPACE, label))


def find_process(process_repo: ProcessRepository, code: str) -> dict | None:
    return next((item for item in process_repo.list() if item.get("process_code") == code), None)


def find_version(version_repo: VersionRepository, process_id: str, status: str | None = None) -> dict | None:
    versions = version_repo.list_by_process(process_id)
    if status is not None:
        versions = [item for item in versions if item.get("status") == status]
    return versions[0] if versions else None


def ensure_process(process_repo: ProcessRepository, code: str, name: str, process_id: str, parent_process_id: str | None = None) -> dict:
    existing = find_process(process_repo, code)
    if existing:
        if parent_process_id and str(existing.get("parent_process_id")) != str(parent_process_id):
            return process_repo.update(existing["process_id"], {"parent_process_id": parent_process_id}) or existing
        return existing
    return process_repo.create(
        {
            "process_id": process_id,
            "process_code": code,
            "name": name,
            "description": "Fixture jerárquico reproducible para modelado de procesos",
            "abstraction_level": 0,
            "parent_process_id": parent_process_id,
            "status": "draft",
        }
    )


def ensure_version(version_repo: VersionRepository, process: dict, label: str) -> dict:
    existing = find_version(version_repo, process["process_id"], "draft")
    if existing:
        return existing
    return version_repo.create(
        process["process_id"],
        {
            "version_id": stable_id(f"{label}:version:1"),
            "version_number": 1,
            "change_description": "Fixture jerárquico TEST_PM_UI",
        },
    )


def ensure_node(node_repo: NodeRepository, version: dict, data: dict) -> dict:
    current = next(
        (item for item in VersionRepository().get(version["version_id"])["nodes"] if item["node_code"] == data["node_code"]),
        None,
    )
    if current:
        # Nested subprocesses are intentionally preserved on repeated runs;
        # the base node specification is only the initial shape.
        if current.get("child_process_id") and not data.get("child_process_id"):
            return current
        changed = {key: value for key, value in data.items() if current.get(key) != value}
        if changed:
            return node_repo.update(current["node_id"], changed) or node_repo.get(current["node_id"])
        return current
    return node_repo.create(version["version_id"], data)


def ensure_transition(transition_repo: TransitionRepository, version: dict, source: dict, target: dict, transition_type: str, label: str | None = None) -> dict:
    with db_cursor() as cursor:
        cursor.execute(
            """SELECT * FROM pm_process_transition
               WHERE version_id = %s AND source_node_id = %s AND target_node_id = %s AND transition_type = %s""",
            (version["version_id"], source["node_id"], target["node_id"], transition_type),
        )
        existing = cursor.fetchone()
    if existing:
        result = dict(existing)
        if label is not None and result.get("label") != label:
            with db_cursor() as cursor:
                cursor.execute(
                    "UPDATE pm_process_transition SET label = %s, updated_at = NOW() WHERE transition_id = %s RETURNING *",
                    (label, result["transition_id"]),
                )
                result = dict(cursor.fetchone())
        return result
    return transition_repo.create(
        version["version_id"],
        {
            "transition_id": stable_id(f"{version['version_id']}:{source['node_code']}:{target['node_code']}:{transition_type}"),
            "source_node_id": source["node_id"],
            "target_node_id": target["node_id"],
            "transition_type": transition_type,
            "label": label,
            "properties": {},
        },
    )


def patch_parent_node_via_api(node_id: str, child_process_id: str) -> dict:
    """Use the existing HTTP contract for the parent semantic conversion."""
    body = json.dumps({"node_type": "subprocess", "child_process_id": child_process_id}).encode("utf-8")
    request = urllib.request.Request(
        f"http://127.0.0.1:{os.environ.get('WEBAPP_JAVA_PORT', '8051')}/api/process-modeling/nodes/{node_id}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="PATCH",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError) as exc:
        raise RuntimeError("No se pudo ejecutar PATCH del nodo padre en la API local") from exc
    if payload.get("status") != "ok" or payload.get("data", {}).get("node_type") != "subprocess":
        raise RuntimeError(f"PATCH del nodo padre rechazado: {payload}")
    return payload["data"]


def ensure_simple_child(processes, versions, nodes, transitions, code: str, name: str, nested: bool = False) -> dict:
    process = ensure_process(processes, code, name, stable_id(f"process:{code}"))
    version = ensure_version(versions, process, code)
    specs = [("INPUT", "input", "Entrada"), ("OP", "operation", "Operación interna"), ("OUTPUT", "output", "Salida")]
    created = {}
    for node_code, node_type, node_name in specs:
        created[node_code] = ensure_node(nodes, version, {
            "node_id": stable_id(f"{code}:node:{node_code}"),
            "node_code": node_code, "node_type": node_type, "name": node_name,
            "description": None, "properties": {},
        })
    ensure_transition(transitions, version, created["INPUT"], created["OP"], "sequence")
    ensure_transition(transitions, version, created["OP"], created["OUTPUT"], "sequence")
    return process


def ensure_simple_flow(version_repo: VersionRepository, node_repo: NodeRepository, transition_repo: TransitionRepository, process: dict, label: str) -> dict:
    version = ensure_version(version_repo, process, label)
    specs = [("INPUT", "input", f"Entrada {label}", {}), ("OUTPUT", "output", f"Salida {label}", {"output_role": "normal"})]
    nodes = {}
    for code, node_type, name, extra in specs:
        nodes[code] = ensure_node(node_repo, version, {
            "node_id": stable_id(f"{version['version_id']}:node:{code}"),
            "node_code": code,
            "node_type": node_type,
            "name": name,
            "description": None,
            "properties": {},
            **extra,
        })
    ensure_transition(transition_repo, version, nodes["INPUT"], nodes["OUTPUT"], "sequence")
    return version


def remove_generated_duplicate_parent_node(version_id: str, code: str, preferred_code: str) -> None:
    with db_cursor() as cursor:
        cursor.execute(
            """DELETE FROM pm_process_node duplicate
               WHERE duplicate.version_id = %s AND duplicate.node_code = %s
                 AND EXISTS (SELECT 1 FROM pm_process_node preferred WHERE preferred.version_id = duplicate.version_id AND preferred.node_code = %s)
                 AND NOT EXISTS (SELECT 1 FROM pm_process_transition t WHERE t.source_node_id = duplicate.node_id OR t.target_node_id = duplicate.node_id)""",
            (version_id, code, preferred_code),
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="print the resulting IDs as JSON")
    args = parser.parse_args()

    processes = ProcessRepository()
    versions = VersionRepository()
    nodes = NodeRepository()
    transitions = TransitionRepository()

    parent = processes.get(PARENT_PROCESS_ID)
    if not parent or parent.get("process_code") != PARENT_CODE:
        raise RuntimeError(f"El proceso exacto no coincide con {PARENT_PROCESS_ID}/{PARENT_CODE}")
    parent_version = versions.get(PARENT_VERSION_ID)
    if not parent_version or str(parent_version.get("process_id")) != PARENT_PROCESS_ID:
        raise RuntimeError(f"La versión exacta no pertenece al padre: {PARENT_VERSION_ID}")
    parent_payload = versions.get(parent_version["version_id"])
    parent_node = next((item for item in parent_payload["nodes"] if str(item["node_id"]) == PARENT_NODE_ID), None)
    if not parent_node or parent_node.get("name") != "Operación 1":
        raise RuntimeError(f"El nodo exacto no es OP1/Operación 1: {PARENT_NODE_ID}")

    child = ensure_process(processes, CHILD_CODE, "Proceso hijo TEST_PM_UI", stable_id("child-process"), PARENT_PROCESS_ID)
    op2_child = ensure_process(processes, OP2_CHILD_CODE, "Subproceso de Operación 2", stable_id("op2-child-process"), PARENT_PROCESS_ID)
    op3_child = ensure_process(processes, OP3_CHILD_CODE, "Subproceso de Operación 3", stable_id("op3-child-process"), PARENT_PROCESS_ID)
    op1_1_child = ensure_process(processes, OP1_1_CHILD_CODE, "Subproceso de Operación 1.1", stable_id("op1-1-child-process"), str(child["process_id"]))
    child_version = ensure_version(versions, child, "child")
    child_nodes: dict[str, dict] = {}
    node_specs = [
        ("INPUT", "input", "Entrada", {}),
        ("OP1.1", "operation", "Operación 1.1", {}),
        ("OP1.2", "operation", "Operación 1.2", {}),
        ("STOCK", "stock", "Stock 24", {"stock": {"capacity": 24, "initial_quantity": 24, "unit": "unidades"}}),
        ("DECISION", "decision", "Decisión", {}),
        ("OUTPUT_NORMAL", "output", "Salida normal", {"output_role": "normal"}),
        ("OUTPUT_WASTE", "output", "Salida waste", {"output_role": "waste"}),
    ]
    for code, node_type, name, extra in node_specs:
        payload = {
            "node_id": stable_id(f"{child_version['version_id']}:node:{code}"),
            "node_code": code,
            "node_type": node_type,
            "name": name,
            "description": None,
            "properties": extra.get("properties", {"stock": extra["stock"]} if "stock" in extra else {}),
            **{key: value for key, value in extra.items() if key != "stock"},
        }
        child_nodes[code] = ensure_node(nodes, child_version, payload)

    sequence = [("INPUT", "OP1.1"), ("OP1.1", "OP1.2"), ("OP1.2", "STOCK"), ("STOCK", "DECISION")]
    for source_code, target_code in sequence:
        ensure_transition(transitions, child_version, child_nodes[source_code], child_nodes[target_code], "sequence")
    ensure_transition(transitions, child_version, child_nodes["DECISION"], child_nodes["OUTPUT_NORMAL"], "branch", "Sí")
    ensure_transition(transitions, child_version, child_nodes["DECISION"], child_nodes["OUTPUT_WASTE"], "branch", "No")

    # OP1.1 is itself a subprocess. OP1.2, stock 24, and Sí/No remain in this child flow.
    child_nodes["OP1.1"] = nodes.update(child_nodes["OP1.1"]["node_id"], {
        "node_type": "subprocess",
        "child_process_id": str(op1_1_child["process_id"]),
    }) or child_nodes["OP1.1"]
    ensure_simple_flow(versions, nodes, transitions, op1_1_child, "OP1.1")

    # The parent fixture exposes OP2 and OP3 as independently expandable subprocesses.
    parent_payload = versions.get(parent_version["version_id"])
    parent_nodes = {item["node_code"]: item for item in parent_payload["nodes"]}
    for code, name, child_process in (("OP2", "Operación 2", op2_child), ("OP3", "Operación 3", op3_child)):
        preferred_code = next((candidate for candidate in parent_nodes if candidate.endswith(f"_{code}")), code)
        parent_node_item = parent_nodes.get(preferred_code) or parent_nodes.get(code)
        if not parent_node_item:
            parent_node_item = nodes.create(parent_version["version_id"], {
                "node_id": stable_id(f"{parent_version['version_id']}:node:{code}"),
                "node_code": code,
                "node_type": "subprocess",
                "name": name,
                "description": None,
                "child_process_id": str(child_process["process_id"]),
                "properties": {},
            })
        else:
            nodes.update(parent_node_item["node_id"], {"node_type": "subprocess", "child_process_id": str(child_process["process_id"])})
            if preferred_code != code:
                remove_generated_duplicate_parent_node(parent_version["version_id"], code, preferred_code)
    ensure_simple_flow(versions, nodes, transitions, op2_child, "OP2")
    ensure_simple_flow(versions, nodes, transitions, op3_child, "OP3")

    parent_node = patch_parent_node_via_api(PARENT_NODE_ID, str(child["process_id"]))

    # Extend the same stable fixture so every parent operation can be tested as
    # a subprocess. OP1.1 is nested one level deeper inside OP1's child graph.
    op2_child = ensure_simple_child(processes, versions, nodes, transitions,
                                    "TEST_PM_UI_OP2_CHILD_1784458754642", "Subflujo Operación 2")
    op3_child = ensure_simple_child(processes, versions, nodes, transitions,
                                    "TEST_PM_UI_OP3_CHILD_1784458754642", "Subflujo Operación 3")
    nested_child = ensure_simple_child(processes, versions, nodes, transitions,
                                       "TEST_PM_UI_OP1_1_CHILD_1784458754642", "Subflujo Operación 1.1")
    parent_payload = versions.get(PARENT_VERSION_ID)
    for node in parent_payload["nodes"]:
        if node["node_code"] == f"{PARENT_CODE}_OP2":
            nodes.update(node["node_id"], {"node_type": "subprocess", "child_process_id": str(op2_child["process_id"])})
        if node["node_code"] == f"{PARENT_CODE}_OP3":
            nodes.update(node["node_id"], {"node_type": "subprocess", "child_process_id": str(op3_child["process_id"])})
    child_payload = versions.get(child_version["version_id"])
    nested_node = next((node for node in child_payload["nodes"] if node["node_code"] == "OP1.1"), None)
    if nested_node:
        nodes.update(nested_node["node_id"], {"node_type": "subprocess", "child_process_id": str(nested_child["process_id"])})

    result = {
        "parent_process_id": str(parent["process_id"]),
        "parent_version_id": str(parent_version["version_id"]),
        "parent_node_id": str(parent_node["node_id"]),
        "child_process_id": str(child["process_id"]),
        "child_version_id": str(child_version["version_id"]),
        "child_node_ids": {code: str(node["node_id"]) for code, node in child_nodes.items()},
        "child_transition_count": len(sequence) + 2,
        "op2_child_process_id": str(op2_child["process_id"]),
        "op3_child_process_id": str(op3_child["process_id"]),
        "nested_op1_1_child_process_id": str(nested_child["process_id"]),
        "op2_child_process_id": str(op2_child["process_id"]),
        "op3_child_process_id": str(op3_child["process_id"]),
        "op1_1_child_process_id": str(op1_1_child["process_id"]),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2) if args.json else "Seed OK\n" + json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
