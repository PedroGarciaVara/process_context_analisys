"""Causal graph aggregate rules and operations."""

from .operations import ensure_acyclic, ensure_deletion_allowed, project_tree
from .rules import (
    GraphDomainError,
    normalize_node_type,
    normalize_relationship_type,
    project_graph_as_tree,
    validate_no_cycle,
    validate_relationship_signature,
    would_create_cycle,
)

__all__ = [
    "GraphDomainError",
    "ensure_acyclic",
    "ensure_deletion_allowed",
    "normalize_node_type",
    "normalize_relationship_type",
    "project_graph_as_tree",
    "project_tree",
    "validate_no_cycle",
    "validate_relationship_signature",
    "would_create_cycle",
]
