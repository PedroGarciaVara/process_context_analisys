from ...dto import integer
from ...ports.outbound import CauseRepositoryPort, HypothesisRepositoryPort


class GetHypothesisDeletePreview:
    """Build the confirmation data for deleting a hypothesis."""

    def __init__(self, hypotheses: HypothesisRepositoryPort, causes: CauseRepositoryPort):
        self.hypotheses = hypotheses
        self.causes = causes

    def execute(self, hypothesis_id: int | str) -> dict[str, object]:
        resolved_id = integer(hypothesis_id)
        hypothesis = self.hypotheses.get(resolved_id) if resolved_id else None
        if not hypothesis:
            raise ValueError("Hipotesis no encontrada.")
        cause = self.causes.get(int(hypothesis["causa_id"]))
        return {
            "hipotesis_id": int(hypothesis["id"]),
            "causa_id": int(hypothesis["causa_id"]),
            "title": "Confirmar eliminacion de hipotesis",
            "message": f"Vas a eliminar '{hypothesis.get('descripcion') or 'Hipotesis sin descripcion'}'.",
            "detail": f"Causa vinculada: {cause.get('nombre', 'Causa desconocida') if cause else 'Causa desconocida'} | Estado actual: {hypothesis.get('estado') or 'pendiente'}",
            "confirm_label": "Eliminar",
            "cancel_label": "Cancelar",
            "tone": "danger",
        }
