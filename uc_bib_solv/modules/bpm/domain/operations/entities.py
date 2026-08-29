"""Canonical operation and stage domain entities."""

from __future__ import annotations

from dataclasses import dataclass

from ..shared.exceptions import BpmDomainError
from ..shared.value_objects import require_text


@dataclass(frozen=True)
class Stage:
    code: str
    name: str
    sequence: int
    description: str | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "code", require_text(self.code, "code"))
        object.__setattr__(self, "name", require_text(self.name, "name"))
        if isinstance(self.sequence, bool) or not isinstance(self.sequence, int) or self.sequence < 0:
            raise BpmDomainError("sequence debe ser un entero no negativo", "invalid_integer", "sequence")


__all__ = ["Stage"]
