from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Mapping

from .contracts import ToolRequest, ToolResult, ToolContext
from .errors import AgentToolError, ToolNotFoundError
from .validation import object_args

ToolHandler = Callable[[Mapping[str, Any], ToolContext], Any]


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: ToolHandler
    read_only: bool = True

    def manifest(self) -> dict[str, Any]:
        return {"name": self.name, "description": self.description, "input_schema": self.input_schema, "read_only": self.read_only}


class ToolRegistry:
    """Small deterministic registry suitable for discovery and dependency injection."""

    def __init__(self, definitions: list[ToolDefinition] | None = None):
        self._definitions: dict[str, ToolDefinition] = {}
        for definition in definitions or []:
            self.register(definition)

    def register(self, definition: ToolDefinition) -> None:
        if not definition.name or definition.name in self._definitions:
            raise AgentToolError(f"Nombre de tool inválido o duplicado: {definition.name}", "duplicate_tool")
        self._definitions[definition.name] = definition

    def get(self, name: str) -> ToolDefinition:
        try:
            return self._definitions[name]
        except KeyError as exc:
            raise ToolNotFoundError(name) from exc

    def manifest(self) -> list[dict[str, Any]]:
        return [self._definitions[name].manifest() for name in sorted(self._definitions)]

    def invoke(self, name: str, request: ToolRequest | None = None, **arguments: Any) -> ToolResult:
        definition = self.get(name)
        request = request or ToolRequest(arguments=arguments)
        args = object_args(request.arguments)
        context = ToolContext(request.trace_id, name, actor=request.actor)
        try:
            return ToolResult(definition.handler(args, context), context)
        except AgentToolError:
            raise
        except (ValueError, TypeError) as exc:
            raise AgentToolError(str(exc), "invalid_tool_request") from exc

