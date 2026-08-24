"""Common inbound use-case protocol for adapters."""

from typing import Any, Protocol


class UseCase(Protocol):
    def execute(self, *args: Any, **kwargs: Any) -> Any: ...


__all__ = ["UseCase"]
