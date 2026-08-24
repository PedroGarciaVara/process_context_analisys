class CausalTreeError(ValueError):
    """Base error for RCA_TREE invariants."""


class InvalidRelationshipError(CausalTreeError):
    pass


class CycleDetectedError(CausalTreeError):
    pass


class NodeDeletionError(CausalTreeError):
    pass

