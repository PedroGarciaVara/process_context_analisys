"""Stable cross-domain references shared by BPM and TREE integrations."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BpmRef:
    """Opaque BPM identity; it deliberately contains no domain entity."""

    identifier: str

    def __post_init__(self) -> None:
        value = str(self.identifier).strip()
        if not value:
            raise ValueError("La referencia BPM requiere un identificador.")
        object.__setattr__(self, "identifier", value)

    @classmethod
    def from_value(cls, value) -> "BpmRef":
        return cls(str(value))

    def as_dict(self) -> dict[str, str]:
        return {"id": self.identifier}


class ProcessRef(BpmRef):
    pass


class OperationRef(BpmRef):
    pass


class MachineRef(BpmRef):
    pass


class ContractRef(BpmRef):
    def as_legacy_int(self) -> int:
        return int(self.identifier)


__all__ = ["BpmRef", "ProcessRef", "OperationRef", "MachineRef", "ContractRef"]
