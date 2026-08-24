"""Composition root for BPM process-modeling application services."""

from ..application.process_modeling_application import ProcessModelingApplication
from .wiring import build_bpm_postgres_persistence_adapter


def create_process_modeling_handlers():
    return ProcessModelingApplication(build_bpm_postgres_persistence_adapter())


def build_process_modeling(connection_factory=None):
    persistence = build_bpm_postgres_persistence_adapter(connection_factory=connection_factory)
    return ProcessModelingApplication(persistence)


__all__ = ["build_process_modeling", "create_process_modeling_handlers"]
