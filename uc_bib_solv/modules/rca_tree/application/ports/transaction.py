from __future__ import annotations

from contextlib import AbstractContextManager
from typing import Any, Protocol


class TransactionPort(Protocol):
    """Minimal transactional boundary required by RCA_TREE persistence."""

    def cursor(self) -> AbstractContextManager[Any]: ...


__all__ = ["TransactionPort"]
