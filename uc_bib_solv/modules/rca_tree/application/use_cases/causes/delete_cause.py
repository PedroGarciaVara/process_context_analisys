from ...dto import integer
from ...ports.outbound import CauseRepositoryPort
from ....domain.exceptions import CausalTreeNotFoundError


class DeleteCause:
    """Delete a causal node when its persistence rules allow it."""

    def __init__(self, causes: CauseRepositoryPort):
        self.causes = causes

    def execute(self, cause_id: int | str) -> dict[str, object]:
        resolved_id = integer(cause_id)
        if not resolved_id or not self.causes.delete(resolved_id):
            raise CausalTreeNotFoundError("Causa no encontrada.")
        return {"deleted": True, "message": "Causa eliminada."}
