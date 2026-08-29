"""Canonical BPM process aggregate."""

from .context import ContextDetail, ContextRecord, calculate_kpi
from .entities import Process, ProcessNode, ProcessTransition
from .exceptions import NotDraftError, NotFoundError, ProcessModelingError
from .rules import diagram_transitions, validate_graph, validate_hierarchy

__all__ = [
    "ContextDetail",
    "ContextRecord",
    "NotDraftError",
    "NotFoundError",
    "Process",
    "ProcessModelingError",
    "ProcessNode",
    "ProcessTransition",
    "calculate_kpi",
    "diagram_transitions",
    "validate_graph",
    "validate_hierarchy",
]
