"""Machine-contract association entity."""

from dataclasses import dataclass

from ..value_objects import require_positive_int


@dataclass(frozen=True)
class MachineContractAssociation:
    contract_id: int
    machine_id: int

    def __post_init__(self) -> None:
        object.__setattr__(self, "contract_id", require_positive_int(self.contract_id, "contract_id"))
        object.__setattr__(self, "machine_id", require_positive_int(self.machine_id, "machine_id"))
