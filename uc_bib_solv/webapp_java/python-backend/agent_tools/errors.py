class AgentToolError(Exception):
    """Safe, client-facing error raised by a tool contract."""

    def __init__(self, message: str, code: str = "invalid_tool_request"):
        super().__init__(message)
        self.code = code


class ToolNotFoundError(AgentToolError):
    def __init__(self, name: str):
        super().__init__(f"Tool no registrado: {name}", "tool_not_found")
