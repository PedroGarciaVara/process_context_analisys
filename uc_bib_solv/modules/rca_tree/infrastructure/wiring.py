from ..adapters.outbound.tree_persistence import (
    CauseRepositoryAdapter,
    HypothesisRepositoryAdapter,
    RcaTreePostgresAdapter,
)
from ..application.use_cases import (
    CreateCause,
    CreateContractNode,
    CreateHypothesis,
    DeleteCause,
    DeleteHypothesis,
    GetCauseDetail,
    GetHypothesisDeletePreview,
    GetTree,
    LinkReusableNode,
    ListHypotheses,
    SearchReusableNodes,
    UpdateCause,
    UpdateHypothesis,
)
from ..application.use_cases.causes.move_cause import MoveCause
from .application import RcaTreeApplication


def build_rca_tree_application(*, persistence=None, contract_context=None) -> RcaTreeApplication:
    persistence = persistence or build_rca_tree_postgres_adapter(contract_context=contract_context)
    causes = CauseRepositoryAdapter(persistence)
    hypotheses = HypothesisRepositoryAdapter(persistence)
    reparenting = CausalReparentingAdapter(persistence)
    return RcaTreeApplication(
        get_tree=GetTree(persistence),
        get_cause_detail=GetCauseDetail(causes, hypotheses),
        create_cause=CreateCause(causes),
        update_cause=UpdateCause(causes),
        delete_cause=DeleteCause(causes),
        create_hypothesis=CreateHypothesis(hypotheses),
        update_hypothesis=UpdateHypothesis(hypotheses),
        list_hypotheses=ListHypotheses(hypotheses),
        delete_hypothesis=DeleteHypothesis(hypotheses),
        hypothesis_delete_preview=GetHypothesisDeletePreview(hypotheses, causes),
        search_reusable_nodes=SearchReusableNodes(persistence),
        link_reusable_node=LinkReusableNode(persistence),
        create_contract_node=CreateContractNode(persistence),
        move_cause=MoveCause(reparenting),
    )


def build_rca_tree_postgres_adapter(*, contract_context=None):
    """Compose temporary SQL repositories only at the RCA_TREE edge."""
    from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import causa_repo, hipotesis_repo, node_repo, relationship_repo
    from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import causas_repository

    return RcaTreePostgresAdapter(
        causa_repo, hipotesis_repo, node_repo, relationship_repo, causas_repository,
        contract_context=contract_context,
    )


class CausalReparentingAdapter:
    """Expose the atomic T03 repository contract without widening T03 files."""

    def __init__(self, persistence):
        self._persistence = persistence

    def get_move_context(self, cause_id, parent_id=None):
        loader = getattr(self._persistence, "get_move_context", None)
        if callable(loader):
            return loader(int(cause_id), parent_id)
        from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import causa_repo
        return causa_repo.get_move_context(int(cause_id), parent_id)

    def move_cause(self, command):
        mover = getattr(self._persistence, "move_cause", None) or getattr(self._persistence, "reparent", None)
        if callable(mover):
            return mover(command)
        from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import causa_repo
        return causa_repo.move_cause(command)
