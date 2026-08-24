class BpmDomainError(ValueError):
    """Business validation error independent of the transport layer."""

    def __init__(self, message: str, code: str = "invalid_bpm_entity", field: str | None = None):
        super().__init__(message)
        self.code = code
        self.field = field


# Compatibility names for the former operational bounded context. The
# implementation remains owned by BPM.
OperationalModelError = BpmDomainError


class OperationalNotFoundError(BpmDomainError):
    def __init__(self, message: str = "Recurso operacional no encontrado."):
        super().__init__(message, "not_found")
