from typing import Any

from ...dto import normalize_cause_type, integer
from ...ports.outbound import CauseRepositoryPort


class CreateCause:
    """Create a causal node under a contract or parent cause."""

    def __init__(self, causes: CauseRepositoryPort):
        self.causes = causes

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        contract_id = integer(payload.get("contract_id"))
        parent_id = integer(payload.get("parent_id"))
        if not contract_id:
            raise ValueError("Se requiere un contrato para crear una causa.")
        name = (payload.get("nombre") or "").strip()
        return {
            "cause": self.causes.create(
                contract_id,
                name,
                payload.get("descripcion"),
                normalize_cause_type(payload.get("tipo")),
                payload.get("categoria"),
                parent_id,
            ),
            "message": "Causa creada.",
        }
