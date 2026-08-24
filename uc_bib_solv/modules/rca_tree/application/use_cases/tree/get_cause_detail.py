from typing import Any

from ...dto import integer, legacy_contract_id
from ...ports.outbound import CauseRepositoryPort, HypothesisRepositoryPort


class GetCauseDetail:
    """Resolve the cause/hypothesis editing context used by the UI."""

    def __init__(self, causes: CauseRepositoryPort, hypotheses: HypothesisRepositoryPort):
        self.causes = causes
        self.hypotheses = hypotheses

    def execute(self, params: dict[str, Any]) -> dict[str, Any]:
        contract_id = legacy_contract_id(params.get("contrato_id"))
        cause_id = integer(params.get("causa_id"))
        parent_id = integer(params.get("parent_id"))
        hypothesis_id = integer(params.get("hipotesis_id"))
        hypothesis = self.hypotheses.get(hypothesis_id) if hypothesis_id else None
        if hypothesis and not cause_id:
            cause_id = int(hypothesis["causa_id"])
        cause = self.causes.get(cause_id) if cause_id else None
        if cause and not contract_id:
            contract_id = int(cause["contrato_id"])
        if parent_id and not contract_id:
            parent = self.causes.get(parent_id)
            if parent:
                contract_id = int(parent["contrato_id"])
        mode = (
            "new_root"
            if not cause_id and not parent_id and not hypothesis_id
            else "edit_hipotesis"
            if hypothesis_id
            else "edit_cause"
            if cause_id
            else "new_child"
        )
        hypotheses = self.hypotheses.list_for_cause(cause_id) if cause_id else []
        return {
            "contract_id": contract_id,
            "causa_id": cause_id,
            "parent_id": parent_id,
            "hipotesis_id": hypothesis_id,
            "mode": mode,
            "ready": bool(contract_id),
            "cause": cause,
            "hipotesis": hypothesis,
            "hypotheses": hypotheses,
        }
