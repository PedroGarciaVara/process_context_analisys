class CausalTreeError(ValueError):
    """Base error for RCA_TREE invariants.

    ``code``, ``status`` and ``details`` are deliberately transport-neutral.
    HTTP adapters can serialize them without making the domain depend on HTTP.
    """

    code = "RCA_DOMAIN_ERROR"
    status = 422

    def __init__(self, message: str = "Error en el árbol causal.", *, details=None):
        super().__init__(message)
        self.message = message
        self.details = dict(details or {})

    def as_error(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "status": self.status,
            "details": dict(self.details),
        }


class CausalTreeValidationError(CausalTreeError):
    """Invalid entity or command data."""

    code = "RCA_INVALID_REQUEST"
    status = 400


class CausalTreeNotFoundError(CausalTreeError):
    """A requested causal domain object does not exist."""

    code = "RCA_CAUSE_NOT_FOUND"
    status = 404


class CausalTreeStateError(CausalTreeError):
    """A domain state transition is not allowed."""

    code = "RCA_ROOT_POLICY"
    status = 409


class InvalidRelationshipError(CausalTreeError):
    code = "RCA_INVALID_RELATIONSHIP"
    status = 422


class CycleDetectedError(CausalTreeError):
    code = "RCA_CYCLE_DETECTED"
    status = 409


class NodeDeletionError(CausalTreeError):
    pass


class SelfParentError(CausalTreeStateError):
    code = "RCA_SELF_PARENT"


class ContractMismatchError(CausalTreeStateError):
    code = "RCA_CONTRACT_MISMATCH"


class RootPolicyError(CausalTreeStateError):
    code = "RCA_ROOT_POLICY"


class VersionConflictError(CausalTreeStateError):
    code = "RCA_VERSION_CONFLICT"


class InvalidReasonError(CausalTreeValidationError):
    code = "RCA_INVALID_REASON"
    status = 422


class ReadonlyAnalysisError(CausalTreeStateError):
    code = "RCA_READONLY_ANALYSIS"


class PrimaryRelationshipConflictError(CausalTreeStateError):
    code = "RCA_PRIMARY_RELATION_CONFLICT"
