"""Entities of the causal graph aggregate."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..exceptions import InvalidRelationshipError
from ..value_objects import NodeId, NodeType, RelationshipType, normalize_node_type, normalize_relationship_type


ALLOWED_RELATIONSHIPS = {
    (NodeType.CONTRACT, RelationshipType.DEPENDS_ON, NodeType.CONTRACT),
    (NodeType.CONTRACT, RelationshipType.DEPENDS_ON, NodeType.CAUSE),
    (NodeType.CAUSE, RelationshipType.CAUSES, NodeType.CAUSE),
    (NodeType.CAUSE, RelationshipType.DEPENDS_ON, NodeType.CONTRACT),
    (NodeType.CONTRACT, RelationshipType.VERIFIED_BY, NodeType.HYPOTHESIS),
    (NodeType.CAUSE, RelationshipType.VERIFIED_BY, NodeType.HYPOTHESIS),
    (NodeType.CONTRACT, RelationshipType.BELONGS_TO, NodeType.MACHINE),
    (NodeType.CONTRACT, RelationshipType.BELONGS_TO, NodeType.PROCESS),
    (NodeType.CAUSE, RelationshipType.BELONGS_TO, NodeType.MACHINE),
    (NodeType.CAUSE, RelationshipType.BELONGS_TO, NodeType.PROCESS),
}


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
            raise ValueError("El nombre del nodo es obligatorio.")


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
            raise ValueError("Una causa requiere contrato y nombre.")


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
            raise ValueError("Una hipótesis requiere causa y descripción.")


@dataclass(frozen=True)
class Relationship:
    parent_node_id: NodeId
    child_node_id: NodeId
    relationship_type: RelationshipType

    def __post_init__(self) -> None:
        object.__setattr__(self, "relationship_type", normalize_relationship_type(self.relationship_type))

    @classmethod
    def validate_signature(cls, parent: NodeType | str, relation: RelationshipType | str, child: NodeType | str) -> None:
        signature = (normalize_node_type(parent), normalize_relationship_type(relation), normalize_node_type(child))
        if signature not in ALLOWED_RELATIONSHIPS:
            raise InvalidRelationshipError(f"Combinación de relación no permitida: {signature[0]} -[{signature[1]}]-> {signature[2]}")
