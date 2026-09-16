#!/usr/bin/env python3
"""Read-only verification of every persisted BPM graph rendered by Flow Studio."""

from __future__ import annotations

import argparse
import json
import urllib.request
from collections import Counter, defaultdict, deque


NODE_WIDTH = {"input": 62, "output": 62, "decision": 84}
NODE_HEIGHT = {"input": 62, "output": 62, "decision": 84}


def get_json(url: str):
    with urllib.request.urlopen(url, timeout=10) as response:
        payload = json.load(response)
    return payload.get("data", payload)


def dimensions(graph: dict) -> tuple[int, int, int]:
    nodes = graph.get("nodes", [])
    edges = graph.get("diagram_transitions", graph.get("transitions", []))
    ids = {str(node["node_id"]) for node in nodes}
    indegree = {node_id: 0 for node_id in ids}
    outgoing = defaultdict(list)
    for edge in edges:
        source, target = str(edge["source_node_id"]), str(edge["target_node_id"])
        if source in ids and target in ids:
            outgoing[source].append(target)
            indegree[target] += 1
    depth = {node_id: 0 for node_id in ids}
    queue = deque(node_id for node_id, count in indegree.items() if count == 0)
    visited = set()
    while queue:
        current = queue.popleft()
        if current in visited:
            continue
        visited.add(current)
        for target in outgoing[current]:
            depth[target] = max(depth[target], depth[current] + 1)
            indegree[target] -= 1
            if indegree[target] <= 0:
                queue.append(target)
    for index, node_id in enumerate(sorted(ids - visited)):
        depth[node_id] = max(depth[node_id], index + 1)

    lanes = Counter(depth.values())
    width = max(1350, 75 + (max(depth.values(), default=0) * 230) + 172 + 180)
    height = max(760, 260 + max((count - 1) * 138 / 2 for count in lanes.values()) + 88 + 180)
    return int(width), int(height), len(ids - visited)


def verify(base_url: str) -> dict:
    processes = get_json(f"{base_url}/api/bpm/processes")
    results = []
    for process in processes:
        graph = get_json(f"{base_url}/api/bpm/processes/{process['process_id']}")
        nodes = graph.get("nodes", [])
        edges = graph.get("diagram_transitions", graph.get("transitions", []))
        ids = {str(node["node_id"]) for node in nodes}
        missing = [edge["transition_id"] for edge in edges if str(edge["source_node_id"]) not in ids or str(edge["target_node_id"]) not in ids]
        self_edges = [edge["transition_id"] for edge in edges if str(edge["source_node_id"]) == str(edge["target_node_id"])]
        width, height, cyclic_nodes = dimensions(graph)
        results.append({
            "process_code": graph["process_code"],
            "name": graph["name"],
            "nodes": len(nodes),
            "relations": len(edges),
            "types": dict(sorted(Counter(node["node_type"] for node in nodes).items())),
            "canvas": f"{width}×{height}",
            "cyclic_nodes": cyclic_nodes,
            "missing_references": missing,
            "self_relations": self_edges,
            "renderable": not missing and not self_edges,
        })
    return {
        "base_url": base_url,
        "process_count": len(results),
        "all_renderable": all(item["renderable"] for item in results),
        "processes": results,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8050")
    args = parser.parse_args()
    report = verify(args.base_url.rstrip("/"))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if report["all_renderable"] else 1)
