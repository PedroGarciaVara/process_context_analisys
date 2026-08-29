"""Canonical read projection for BPM node context."""
from copy import deepcopy

ALIASES = {
    "description": ("description", "operation_description", "detailed_description"),
    "objective": ("objective", "purpose", "mission"),
    "controls": ("controls", "quality_controls"),
    "contracts": ("contracts", "declarative_contract"),
    "assignments": ("assignments", "operation_machine_assignments"),
}
KNOWN = {"description", "summary", "objective", "controls", "contracts", "assignments", "inputs", "outputs", "parameters"}

def _merge(left, right):
    if left is None or left == right:
        return deepcopy(right if left is None else left)
    if isinstance(left, dict) and isinstance(right, dict):
        result = deepcopy(left)
        for key, value in right.items(): result[key] = _merge(result.get(key), value)
        return result
    if isinstance(left, list) and isinstance(right, list): return left + [item for item in right if item not in left]
    if isinstance(left, list): return left if right in left else left + [deepcopy(right)]
    if isinstance(right, list): return [deepcopy(left)] + [item for item in right if item != left]
    return [deepcopy(left), deepcopy(right)]

def build_node_context_detail(node, records=None):
    merged = {}
    metadata = node.get("metadata") if isinstance(node.get("metadata"), dict) else {}
    sources = [node.get("description")] if isinstance(node.get("description"), dict) else ([{"description": node.get("description")}] if node.get("description") not in (None, "") else [])
    sources += [metadata, metadata.get("data") if isinstance(metadata.get("data"), dict) else {}]
    for record in records or []:
        payload = record.get("payload") if isinstance(record.get("payload"), dict) else {}
        sources += [payload, payload.get("data") if isinstance(payload.get("data"), dict) else {}]
    for source in sources:
        for key, value in source.items(): merged[key] = _merge(merged.get(key), value)
    detail = {"additional": {key: value for key, value in merged.items() if key not in KNOWN}}
    for canonical, aliases in ALIASES.items():
        value = None
        for alias in aliases:
            if alias in merged: value = _merge(value, merged[alias])
        if value is not None: detail[canonical] = value
    for key in ("summary", "inputs", "outputs", "parameters"):
        if key in merged: detail[key] = merged[key]
    contracts, assignments = detail.get("contracts"), detail.get("assignments")
    if contracts is not None and assignments is not None:
        detail["contracts_and_assignments"] = (contracts if isinstance(contracts, list) else [contracts]) + [item for item in (assignments if isinstance(assignments, list) else [assignments]) if item not in (contracts if isinstance(contracts, list) else [contracts])]
    elif contracts is not None: detail["contracts_and_assignments"] = contracts
    elif assignments is not None: detail["contracts_and_assignments"] = assignments
    return detail
