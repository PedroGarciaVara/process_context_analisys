"""Extensible, read-oriented tools for agents consuming the UC_BIB_Solve backend.

The package is deliberately an adapter boundary.  Domain rules remain in
``app.domain`` and persistence remains behind the existing services and
repositories; callers can inject those dependencies for tests or deployments.
"""

from .builtin import build_default_registry
from .contracts import ToolContext, ToolRequest, ToolResult
from .registry import ToolDefinition, ToolRegistry

__all__ = [
    "ToolContext",
    "ToolDefinition",
    "ToolRegistry",
    "ToolRequest",
    "ToolResult",
    "build_default_registry",
]
