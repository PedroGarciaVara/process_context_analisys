from ...application.ports.outbound import BackendGateway as BackendToolPort
from ...application.use_cases import ToolRegistry, create_definitions


def create_registry(port: BackendToolPort) -> ToolRegistry:
    return ToolRegistry(create_definitions(port))
