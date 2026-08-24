"""Deprecated compatibility shim for the public backend port and adapter."""

from uc_bib_solv.modules.platform.adapters.agent_tools.adapters.outbound.backend_gateway import ExistingBackendGateway
from uc_bib_solv.modules.platform.adapters.agent_tools.application.ports.outbound import BackendGateway

__all__ = ["BackendGateway", "ExistingBackendGateway"]
