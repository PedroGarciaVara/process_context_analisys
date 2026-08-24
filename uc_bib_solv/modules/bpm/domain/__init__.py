"""Framework-free BPM entities and invariants."""

from .entities import (
    Contract,
    Machine,
    MachineContractAssociation,
    MachineOperationConfiguration,
    Operation,
    Process,
    ProcessVersion,
    Stage,
)
from .processes.entities import ProcessDefinition, ProcessNode, ProcessTransition, ProcessVersion
from .exceptions import BpmDomainError

__all__ = [
    "BpmDomainError",
    "Contract",
    "Machine",
    "MachineContractAssociation",
    "MachineOperationConfiguration",
    "Operation",
    "Process",
    "ProcessDefinition",
    "ProcessNode",
    "ProcessTransition",
    "ProcessVersion",
    "Stage",
]
