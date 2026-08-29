from ...dto import integer
from ...ports.outbound import HypothesisRepositoryPort
from ....domain.exceptions import CausalTreeNotFoundError


class DeleteHypothesis:
    """Delete a hypothesis."""

    def __init__(self, hypotheses: HypothesisRepositoryPort):
        self.hypotheses = hypotheses

    def execute(self, hypothesis_id: int | str) -> dict[str, object]:
        resolved_id = integer(hypothesis_id)
        if not resolved_id or not self.hypotheses.delete(resolved_id):
            raise CausalTreeNotFoundError("Hipotesis no encontrada.")
        return {"deleted": True, "message": "Hipotesis eliminada."}
