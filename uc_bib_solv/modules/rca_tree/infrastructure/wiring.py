from ..adapters.outbound.tree_persistence import (
    CauseRepositoryAdapter,
    HypothesisRepositoryAdapter,
    NodeRepositoryAdapter,
    RelationshipRepositoryAdapter,
    RcaTreePostgresAdapter,
)
from ..application.service import RcaTreeService
from ..application.use_cases import RcaTreeUseCases


def build_rca_tree_service(*, persistence=None) -> RcaTreeService:
    persistence = persistence or build_rca_tree_postgres_adapter()
    return RcaTreeService(RcaTreeUseCases(
        CauseRepositoryAdapter(persistence),
        HypothesisRepositoryAdapter(persistence),
        NodeRepositoryAdapter(persistence),
        RelationshipRepositoryAdapter(persistence),
        persistence,
    ))


build_causal_tree_service = build_rca_tree_service


def build_rca_tree_postgres_adapter():
    """Compose temporary SQL repositories only at the RCA_TREE edge."""
    from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import causa_repo, hipotesis_repo, node_repo, relationship_repo
    from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import causas_repository

    return RcaTreePostgresAdapter(causa_repo, hipotesis_repo, node_repo, relationship_repo, causas_repository)
