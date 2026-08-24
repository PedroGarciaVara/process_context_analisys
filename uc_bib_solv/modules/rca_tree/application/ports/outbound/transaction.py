"""Outbound transaction boundary for RCA_TREE persistence adapters."""

from contextlib import AbstractContextManager
from typing import Any, Protocol


class TransactionPort(Protocol):
    def cursor(self) -> AbstractContextManager[Any]: ...


__all__ = ["TransactionPort"]
