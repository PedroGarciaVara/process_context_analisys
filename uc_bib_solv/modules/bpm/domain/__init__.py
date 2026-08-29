"""Framework-free BPM domain exports."""

from .associations.entities import MachineContractAssociation
from .configurations.entities import MachineOperationConfiguration
from .contracts.entities import Contract
from .machines.entities import Machine
from .operations.entities import Operation, Stage
from .processes.entities import Process, ProcessNode, ProcessTransition
from .shared.exceptions import BpmDomainError

__all__ = [
    "BpmDomainError",
    "Contract",
    "Machine",
    "MachineContractAssociation",
    "MachineOperationConfiguration",
    "Operation",
    "Process",
    "ProcessNode",
    "ProcessTransition",
    "Stage",
]
