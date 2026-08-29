from typing import Any

from ...dto import integer
from ...ports.outbound import TreeQueryPort


class CreateContractNode:
    """Create and link a child contract node from the RCA editor."""

    def __init__(self, queries: TreeQueryPort):
        self.queries = queries

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        contract_id = integer(payload.get("contract_id"))
        name = (payload.get("nombre") or "").strip()
        if not contract_id or not name:
            raise ValueError("Se requiere un contrato activo y un nombre para crear un contrato hijo.")
        result = self.queries.create_contract_child(
            contract_id,
            name,
            objetivo=(payload.get("descripcion") or "").strip() or None,
            metrica=(payload.get("categoria") or "").strip() or None,
        )
        result["message"] = "Contrato creado y vinculado."
        return result
