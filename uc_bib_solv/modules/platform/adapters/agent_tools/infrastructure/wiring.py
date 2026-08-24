from ..adapters.inbound.tools import create_registry
from ..adapters.outbound.backend_gateway import ExistingBackendGateway
from ..application.ports.outbound import BackendGateway as BackendToolPort
from ..application.use_cases import ToolRegistry


def build_default_registry(port: BackendToolPort | None = None) -> ToolRegistry:
    return create_registry(port or ExistingBackendGateway())
