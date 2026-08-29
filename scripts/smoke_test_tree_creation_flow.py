#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import time
from urllib import error, parse, request


BASE_URL = os.environ.get("WEBAPP_JAVA_BASE_URL", "http://127.0.0.1:8050").rstrip("/")


def call(method: str, path: str, payload: dict | None = None) -> dict:
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = request.Request(f"{BASE_URL}{path}", data=body, method=method, headers=headers)
    try:
        with request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {raw}") from exc


def main() -> int:
    suffix = str(int(time.time() * 1000))
    process = call("POST", "/api/bpm/operational/processes", {"name": f"SMOKE RCA PROCESS {suffix}"})
    process_id = process["data"]["id"]

    contract = call(
        "POST",
        "/api/bpm/contracts",
        {
            "processId": process_id,
            "name": f"SMOKE RCA CONTRACT {suffix}",
            "metrica": "SMOKE-LINE",
            "objetivo": "Validate full tree creation flow",
        },
    )
    contract_id = contract["data"]["id"]

    machine = call(
        "POST",
        "/api/bpm/machines",
        {
            "name": f"SMOKE RCA MACHINE {suffix}",
            "processId": process_id,
            "contractId": contract_id,
        },
    )
    machine_id = machine["data"]["id"]

    root_cause = call(
        "POST",
        "/api/rca-tree/causes",
        {
            "contract_id": contract_id,
            "nombre": f"SMOKE ROOT CAUSE {suffix}",
            "tipo": "causa",
            "categoria": "causa",
            "descripcion": "Root cause created by smoke test",
        },
    )
    root_cause_id = root_cause["cause"]["id"]

    child_cause = call(
        "POST",
        "/api/rca-tree/causes",
        {
            "contract_id": contract_id,
            "parent_id": root_cause_id,
            "nombre": f"SMOKE CHILD CAUSE {suffix}",
            "tipo": "causa",
            "categoria": "causa",
            "descripcion": "Child cause created by smoke test",
        },
    )
    child_cause_id = child_cause["cause"]["id"]

    hypothesis = call(
        "POST",
        f"/api/rca-tree/causes/{child_cause_id}/hypotheses",
        {
            "descripcion": f"SMOKE HYPOTHESIS {suffix}",
            "tipo": "aceptacion",
            "criterio_validacion": "Should be visible under child cause",
            "estado": "pendiente",
        },
    )
    hypothesis_id = hypothesis["hypothesis"]["id"]

    tree = call("GET", f"/api/rca-tree/nodes?{parse.urlencode({'view': 'arbol', 'contract_id': contract_id})}")

    summary = {
        "base_url": BASE_URL,
        "process_id": process_id,
        "contract_id": contract_id,
        "machine_id": machine_id,
        "root_cause_id": root_cause_id,
        "child_cause_id": child_cause_id,
        "hypothesis_id": hypothesis_id,
        "tree_root_count": len(tree.get("tree", [])),
        "selected_cause_id": tree.get("selected_cause_id"),
        "hypothesis_buckets": len(tree.get("hypotheses_by_cause", {})),
    }
    print(json.dumps(summary, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
