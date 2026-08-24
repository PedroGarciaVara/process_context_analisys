from typing import Any

from ...ports.outbound import TreeQueryPort


class SearchReusableNodes:
    """Search causal nodes that can be reused in another tree."""

    def __init__(self, queries: TreeQueryPort):
        self.queries = queries

    def execute(self, params: dict[str, Any]) -> dict[str, object]:
        node_type = (params.get("node_type") or "CAUSE").strip()
        text = (params.get("text") or "").strip() or None
        limit = max(1, min(int(params.get("limit") or 25), 100))
        items = self.queries.search_reusable_nodes(node_type, text=text, limit=limit)
        return {"node_type": node_type.upper(), "items": items, "count": len(items)}
