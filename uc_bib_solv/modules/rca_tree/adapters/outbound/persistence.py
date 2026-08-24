"""Compatibility names for the canonical RCA_TREE persistence adapter."""

from .tree_persistence import (
    CauseRepositoryAdapter,
    HypothesisRepositoryAdapter,
    NodeRepositoryAdapter,
    RelationshipRepositoryAdapter,
    RcaTreePostgresAdapter,
)


class CausalTreePostgresAdapter(RcaTreePostgresAdapter):
    """Historical adapter name retained inside the canonical bounded context."""

    def __init__(self, cause_repo=None, hypothesis_repo=None, node_repo=None, relationship_repo=None, tree_repo=None):
        if any(item is None for item in (cause_repo, hypothesis_repo, node_repo, relationship_repo, tree_repo)):
            from uc_bib_solv.modules.rca_tree.infrastructure.wiring import build_rca_tree_postgres_adapter

            composed = build_rca_tree_postgres_adapter()
            cause_repo = cause_repo or composed.cause_repo
            hypothesis_repo = hypothesis_repo or composed.hypothesis_repo
            node_repo = node_repo or composed.node_repo
            relationship_repo = relationship_repo or composed.relationship_repo
            tree_repo = tree_repo or composed.tree_repo
        super().__init__(cause_repo, hypothesis_repo, node_repo, relationship_repo, tree_repo)


class LegacyCausalPersistenceAdapter(CausalTreePostgresAdapter):
    """Compatibility name for callers migrated from the former package."""


__all__ = [
    "CausalTreePostgresAdapter",
    "LegacyCausalPersistenceAdapter",
    "RcaTreePostgresAdapter",
    "CauseRepositoryAdapter",
    "HypothesisRepositoryAdapter",
    "NodeRepositoryAdapter",
    "RelationshipRepositoryAdapter",
]
