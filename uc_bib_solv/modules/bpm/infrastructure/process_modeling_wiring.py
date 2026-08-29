"""Composition root for BPM process-modeling application services."""

from ..application.process_modeling_application import ProcessModelingApplication
from .wiring import build_bpm_postgres_persistence_adapter


def create_process_modeling_handlers():
    adapter = build_bpm_postgres_persistence_adapter()
    return ProcessModelingApplication(adapter.processes, adapter.nodes, adapter.transitions)


def build_process_modeling(connection_factory=None):
    persistence = build_bpm_postgres_persistence_adapter(connection_factory=connection_factory)
    return ProcessModelingApplication(persistence.processes, persistence.nodes, persistence.transitions)


__all__ = ["build_process_modeling", "create_process_modeling_handlers"]
