"""Composition root for the BPM process-modeling application."""

from uc_bib_solv.modules.bpm.infrastructure.wiring import build_bpm_postgres_persistence_adapter
from uc_bib_solv.modules.bpm.process_modeling.application import ProcessModelingApplication


def create_process_modeling_handlers():
    persistence = build_bpm_postgres_persistence_adapter()
    return ProcessModelingApplication(persistence)


def build_process_modeling(connection_factory=None):
    """Compose the PM application with an explicit persistence dependency."""
    persistence = build_bpm_postgres_persistence_adapter(connection_factory=connection_factory)
    return ProcessModelingApplication(persistence)
