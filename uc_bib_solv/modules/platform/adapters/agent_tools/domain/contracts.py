from dataclasses import dataclass, field
from typing import Any, Mapping
from uuid import uuid4


@dataclass(frozen=True)
class ToolRequest:
    arguments: Mapping[str, Any] = field(default_factory=dict)
    actor: str | None = None
    trace_id: str = field(default_factory=lambda: str(uuid4()))


@dataclass(frozen=True)
class ToolContext:
    trace_id: str
    tool_name: str
    source: str = "agent_tools"
    actor: str | None = None

    def provenance(self) -> dict[str, Any]:
        return {"trace_id": self.trace_id, "source": self.source, "tool": self.tool_name, "actor": self.actor}


@dataclass(frozen=True)
class ToolResult:
    data: Any
    context: ToolContext

    def to_dict(self) -> dict[str, Any]:
        return {"data": self.data, "trace": self.context.provenance()}
