"""Shared BPM domain errors."""


class BpmDomainError(ValueError):
    """Business validation error independent of transport or persistence."""

    def __init__(self, message: str, code: str = "invalid_bpm_entity", field: str | None = None):
        super().__init__(message)
        self.code = code
        self.field = field
