from ..shared.exceptions import BpmDomainError


class MachineModelError(BpmDomainError):
    """Functional validation error for the three-level machine model."""

    def __init__(self, message: str, code: str = "invalid_machine_model"):
        super().__init__(message, code)
