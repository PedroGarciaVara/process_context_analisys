"""Deprecated compatibility shim for canonical tool errors."""

from uc_bib_solv.modules.platform.adapters.agent_tools.domain.errors import AgentToolError, ToolNotFoundError

__all__ = ["AgentToolError", "ToolNotFoundError"]
