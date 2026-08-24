from ...dto import integer
from ...ports.outbound import HypothesisRepositoryPort


class ListHypotheses:
    """List hypotheses belonging to a causal node."""

    def __init__(self, hypotheses: HypothesisRepositoryPort):
        self.hypotheses = hypotheses

    def execute(self, cause_id: int | str) -> dict[str, object]:
        resolved_id = integer(cause_id)
        return {
            "causa_id": resolved_id,
            "hypotheses": self.hypotheses.list_for_cause(resolved_id),
        }
