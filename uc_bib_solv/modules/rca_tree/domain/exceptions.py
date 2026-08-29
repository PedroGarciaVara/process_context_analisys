class CausalTreeError(ValueError):
    """Base error for RCA_TREE invariants."""


class CausalTreeValidationError(CausalTreeError):
    """Invalid entity or command data."""


class CausalTreeNotFoundError(CausalTreeError):
    """A requested causal domain object does not exist."""


class CausalTreeStateError(CausalTreeError):
    """A domain state transition is not allowed."""


class InvalidRelationshipError(CausalTreeError):
    pass


class CycleDetectedError(CausalTreeError):
    pass


class NodeDeletionError(CausalTreeError):
    pass
