"""Compatibility aliases for the canonical BPM persistence ports."""

from uc_bib_solv.modules.bpm.application.ports.process_ports import (
    NodeRepositoryPort as NodePort,
    OperationRepositoryPort as OperationPort,
    ProcessRepositoryPort as ProcessPort,
    TransitionRepositoryPort as TransitionPort,
    VersionRepositoryPort as VersionPort,
)

__all__ = ["NodePort", "OperationPort", "ProcessPort", "TransitionPort", "VersionPort"]
