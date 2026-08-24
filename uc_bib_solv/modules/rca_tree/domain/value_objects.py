from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .exceptions import CausalTreeError


class NodeType(StrEnum):
    CONTRACT = "CONTRACT"
    CAUSE = "CAUSE"
    HYPOTHESIS = "HYPOTHESIS"
    MACHINE = "MACHINE"
    PROCESS = "PROCESS"


class RelationshipType(StrEnum):
    DEPENDS_ON = "DEPENDS_ON"
    CAUSES = "CAUSES"
    VERIFIED_BY = "VERIFIED_BY"
    BELONGS_TO = "BELONGS_TO"


@dataclass(frozen=True, order=True)
class NodeId:
    value: int

    def __post_init__(self) -> None:
        if int(self.value) <= 0:
            raise CausalTreeError("El identificador del nodo debe ser positivo.")


@dataclass(frozen=True)
class CauseTag:
    value: str

    ALLOWED = ("maquina", "metodo", "mano de obra", "medida")

    def __post_init__(self) -> None:
        normalized = " ".join(str(self.value).strip().lower().split())
        if normalized not in self.ALLOWED:
            raise CausalTreeError(f"Etiqueta de causa inválida: {self.value!r}")
        object.__setattr__(self, "value", normalized)


def normalize_node_type(value: str | NodeType) -> NodeType:
    try:
        return NodeType(str(value).strip().upper())
    except ValueError as exc:
        raise CausalTreeError(f"Tipo de nodo inválido: {value!r}") from exc


def normalize_relationship_type(value: str | RelationshipType) -> RelationshipType:
    try:
        return RelationshipType(str(value).strip().upper())
    except ValueError as exc:
        raise CausalTreeError(f"Tipo de relación inválido: {value!r}") from exc

