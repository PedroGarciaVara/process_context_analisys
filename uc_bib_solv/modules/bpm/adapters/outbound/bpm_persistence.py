"""BPM PostgreSQL composition adapter.

The SQL repositories remain unchanged during the migration.  This adapter is
the single BPM composition point and exposes them through explicit repository
attributes matching the BPM persistence ports.
"""

from typing import Any

from uc_bib_solv.modules.bpm.application.ports.process_ports import (
    NodeRepositoryPort,
    ProcessRepositoryPort,
    TransitionRepositoryPort,
    VersionRepositoryPort,
)


class BpmPostgresPersistenceAdapter:
    """Compose current PostgreSQL repositories behind BPM ports."""

    processes: ProcessRepositoryPort
    versions: VersionRepositoryPort
    nodes: NodeRepositoryPort
    transitions: TransitionRepositoryPort

    def __init__(
        self,
        *,
        processes: ProcessRepositoryPort | None = None,
        versions: VersionRepositoryPort | None = None,
        nodes: NodeRepositoryPort | None = None,
        transitions: TransitionRepositoryPort | None = None,
        connection_factory: Any = None,
    ):
        missing = [name for name, value in (("processes", processes), ("versions", versions), ("nodes", nodes), ("transitions", transitions)) if value is None]
        if missing:
            raise ValueError(f"El adaptador BPM requiere repositorios inyectados: {', '.join(missing)}")
        self.processes = processes
        self.versions = versions
        self.nodes = nodes
        self.transitions = transitions
        self.connection_factory = connection_factory
