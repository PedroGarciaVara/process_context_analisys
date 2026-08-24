from __future__ import annotations

from typing import Protocol

from ...domain.contracts import ToolRequest, ToolResult


class ToolCatalogPort(Protocol):
    """Public inbound port for discovery and invocation of tools."""

    def manifest(self) -> list[dict]: ...

    def invoke(self, name: str, request: ToolRequest | None = None, **arguments) -> ToolResult: ...
