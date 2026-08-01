class ProcessModelingError(ValueError):
    """Functional error with a stable code suitable for an API adapter."""

    def __init__(self, message: str, code: str = "invalid_process_model"):
        super().__init__(message)
        self.code = code


class NotFoundError(ProcessModelingError):
    def __init__(self, message: str):
        super().__init__(message, "not_found")


class NotDraftError(ProcessModelingError):
    def __init__(self, message: str = "La versión no está en estado draft"):
        super().__init__(message, "version_not_draft")
