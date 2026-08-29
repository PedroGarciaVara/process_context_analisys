from typing import Any

from uc_bib_solv.modules.platform.application.ports import ContractRef, ProcessRef
from ....domain.analyses.entities import Analysis
from ...ports.outbound import AnalysisRepositoryPort, ParticipantRepositoryPort
from ....domain.exceptions import CausalTreeValidationError


class CreateAnalysis:
    """Create an RCA analysis and persist its participants."""

    def __init__(self, analyses: AnalysisRepositoryPort, participants: ParticipantRepositoryPort):
        self.analyses = analyses
        self.participants = participants

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        contract_id = payload.get("template_contract_id") or payload.get("contract_id")
        if contract_id is None:
            raise CausalTreeValidationError("Debe seleccionar una plantilla de causas.")
        contract_ref = ContractRef.from_value(contract_id)
        process_ref = ProcessRef.from_value(payload["process_id"]) if payload.get("process_id") is not None else None
        participants = [
            str(value).strip()
            for value in payload.get("participants", [])
            if str(value).strip()
        ] or [str(payload.get("participant") or "Usuario").strip()]
        indication = str(payload.get("indication") or payload.get("description") or "").strip()
        analysis = Analysis(
            None,
            contract_ref.as_legacy_int(),
            int(process_ref.identifier) if process_ref is not None else None,
            payload.get("machine_id"),
            participants[0],
            indication,
        )
        created = self.analyses.create(
            {
                **payload,
                "contract_id": analysis.contract_id,
                "process_id": analysis.process_id,
                "participants": participants,
                "indication": analysis.opening_description,
            }
        )
        created["participants"] = [
            self.participants.add(int(created["id"]), participant).get("participante", participant)
            for participant in participants
        ]
        return created
