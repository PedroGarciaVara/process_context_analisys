"""Entities of the causal graph aggregate."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .rules import validate_relationship_signature
from ..value_objects import NodeId, NodeType, RelationshipType, normalize_node_type, normalize_relationship_type
from ..exceptions import CausalTreeValidationError


@dataclass
class Node:
    node_id: NodeId
    node_type: NodeType
    name: str
    description: str | None = None
    status: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.node_type = normalize_node_type(self.node_type)
        if not str(self.name).strip():
            raise CausalTreeValidationError("El nombre del nodo es obligatorio.")


@dataclass
class Cause:
    cause_id: int | None
    contract_id: int
    name: str
    parent_id: int | None = None
    description: str | None = None
    kind: str = "causa"
    category: str | None = None

    def __post_init__(self) -> None:
        if self.contract_id <= 0 or not self.name.strip():
            raise CausalTreeValidationError("Una causa requiere contrato y nombre.")


@dataclass
class Hypothesis:
    hypothesis_id: int | None
    cause_id: int
    description: str
    kind: str = "aceptacion"
    validation_criterion: str | None = None
    status: str = "pendiente"

    def __post_init__(self) -> None:
        if self.cause_id <= 0 or not self.description.strip():
            raise CausalTreeValidationError("Una hipótesis requiere causa y descripción.")


@dataclass(frozen=True)
class Relationship:
    parent_node_id: NodeId
    child_node_id: NodeId
    relationship_type: RelationshipType

    def __post_init__(self) -> None:
        object.__setattr__(self, "relationship_type", normalize_relationship_type(self.relationship_type))

    @classmethod
    def validate_signature(cls, parent: NodeType | str, relation: RelationshipType | str, child: NodeType | str) -> None:
        validate_relationship_signature(parent, child, relation)
