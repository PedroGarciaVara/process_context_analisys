"""Framework-free BPM domain exports."""

from .associations.entities import MachineContractAssociation
from .contracts.entities import Contract
from .machines.entities import Machine, MachineOperationConfiguration
from .operations.entities import Stage
from .processes.entities import Process, ProcessNode, ProcessTransition
from .shared.exceptions import BpmDomainError

__all__ = [
    "BpmDomainError",
    "Contract",
    "Machine",
    "MachineContractAssociation",
    "MachineOperationConfiguration",
    "Process",
    "ProcessNode",
    "ProcessTransition",
    "Stage",
]
