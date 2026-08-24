"""Compatibility exports for BPM aggregate entities.

Canonical definitions live in concept-oriented domain packages. This module
is retained only for callers that still import the former flat namespace.
"""

from .associations.entities import MachineContractAssociation
from .configurations.entities import MachineOperationConfiguration
from .contracts.entities import Contract
from .machines.operational_entities import Machine
from .operations.entities import Operation, Stage
from .processes.entities import Process

__all__ = [
    "Contract",
    "Machine",
    "MachineContractAssociation",
    "MachineOperationConfiguration",
    "Operation",
    "Process",
    "Stage",
]
