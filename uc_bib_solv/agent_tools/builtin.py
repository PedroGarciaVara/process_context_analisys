"""Deprecated compatibility shim for the canonical tool catalog."""

from uc_bib_solv.modules.platform.adapters.agent_tools.application.use_cases import create_definitions
from uc_bib_solv.modules.platform.adapters.agent_tools.infrastructure.wiring import build_default_registry

__all__ = ["build_default_registry", "create_definitions"]
