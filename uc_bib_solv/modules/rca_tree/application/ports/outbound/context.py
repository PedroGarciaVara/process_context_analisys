"""Outbound port for BPM context used by RCA_TREE."""

from typing import Any, Protocol

from uc_bib_solv.modules.platform.application.ports import ContractRef, MachineRef, OperationRef, ProcessRef


class BpmContextPort(Protocol):
    def get_process(self, reference: ProcessRef) -> dict[str, Any] | None: ...

    def get_operation(self, reference: OperationRef) -> dict[str, Any] | None: ...

    def get_machine(self, reference: MachineRef) -> dict[str, Any] | None: ...

    def get_contract(self, reference: ContractRef) -> dict[str, Any] | None: ...


__all__ = ["BpmContextPort"]
