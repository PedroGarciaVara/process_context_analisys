"""Compatibility adapter for the Process Modeling bounded context."""

from uc_bib_solv.modules.bpm.adapters.outbound.bpm_persistence import BpmPostgresPersistenceAdapter
from uc_bib_solv.modules.bpm.application.ports.process_ports import (
    NodeRepositoryPort,
    ProcessRepositoryPort,
    TransitionRepositoryPort,
    VersionRepositoryPort,
)


class ProcessModelingPersistenceAdapter(BpmPostgresPersistenceAdapter):
    """Legacy name retained while wiring moves to the BPM adapter."""

    def __init__(
        self,
        *,
        processes: ProcessRepositoryPort,
        versions: VersionRepositoryPort,
        nodes: NodeRepositoryPort,
        transitions: TransitionRepositoryPort,
        connection_factory=None,
    ):
        super().__init__(
            processes=processes,
            versions=versions,
            nodes=nodes,
            transitions=transitions,
            connection_factory=connection_factory,
        )
