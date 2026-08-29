class ProcessModelingError(ValueError):
    """BPM process validation error with a stable application code."""

    def __init__(self, message: str, code: str = "invalid_process_model"):
        super().__init__(message)
        self.code = code


class NotFoundError(ProcessModelingError):
    def __init__(self, message: str):
        super().__init__(message, "not_found")


class NotDraftError(ProcessModelingError):
    def __init__(self, message: str = "El proceso no está en estado draft"):
        super().__init__(message, "process_not_editable")
