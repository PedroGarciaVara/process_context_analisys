from __future__ import annotations

from typing import Any

from uc_bib_solv.modules.platform.application.ports import ContractRef, ProcessRef

from .ports.analysis import AnalysisPort, ParticipantPort, ResultPort
from ..domain.analyses.entities import Analysis, AnalysisResult, normalize_result_type, normalize_state, validate_transition


class AnalysisUseCases:
    def __init__(self, analyses: AnalysisPort, participants: ParticipantPort, results: ResultPort):
        self.analyses, self.participants, self.results = analyses, participants, results

    def list_recent(self, limit=20, status=None, search=None): return self.analyses.list_recent(limit, status, search)
    def list_templates(self, process_id=None): return self.analyses.list_templates(process_id)

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        contract_id = payload.get("template_contract_id") or payload.get("contract_id")
        if contract_id is None:
            raise ValueError("Debe seleccionar una plantilla de causas.")
        contract_ref = ContractRef.from_value(contract_id)
        process_ref = ProcessRef.from_value(payload["process_id"]) if payload.get("process_id") is not None else None
        participants = [str(value).strip() for value in payload.get("participants", []) if str(value).strip()] or [str(payload.get("participant") or "Usuario").strip()]
        indication = str(payload.get("indication") or payload.get("description") or "").strip()
        analysis = Analysis(None, contract_ref.as_legacy_int(), int(process_ref.identifier) if process_ref is not None else None, payload.get("machine_id"), participants[0], indication)
        created = self.analyses.create({**payload, "contract_id": analysis.contract_id, "process_id": analysis.process_id, "participants": participants, "indication": analysis.opening_description})
        created["participants"] = [self.participants.add(int(created["id"]), participant).get("participante", participant) for participant in participants]
        return created

    def get(self, analysis_id):
        analysis = self.analyses.get(int(analysis_id))
        if analysis is not None:
            analysis.setdefault("participants", self.participants.list_for_analysis(int(analysis_id)))
            analysis.setdefault("results", self.results.list_for_analysis(int(analysis_id)))
        return analysis

    def update(self, analysis_id, payload):
        if payload.get("status") is not None:
            current = self.get(int(analysis_id))
            validate_transition(current.get("estado", "abierto"), payload["status"]) if current else normalize_state(payload["status"])
        return self.analyses.update(int(analysis_id), payload)

    def save_result(self, analysis_id, payload):
        result_type = normalize_result_type(payload.get("element_type"))
        AnalysisResult(int(analysis_id), result_type, payload.get("cause_id") if result_type == "causa" else None, payload.get("hypothesis_id") if result_type == "hipotesis" else None, payload.get("evidence"), payload.get("conclusion"), payload.get("evaluation") or "pendiente")
        return self.results.save(int(analysis_id), {**payload, "element_type": result_type})


CausalAnalysisUseCases = AnalysisUseCases
