"""Invariants and payload rules for contracts."""

from __future__ import annotations

from ..shared.exceptions import BpmDomainError
from ..shared.rules import validate_name


def validate_contract_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise BpmDomainError("contract debe ser un objeto", "invalid_payload")
    result = dict(payload)
    result["name"] = validate_name(payload.get("name"))
    kpi = payload.get("kpi_description")
    if not isinstance(kpi, str) or kpi == "":
        raise BpmDomainError("kpi_description es obligatorio.", "invalid_kpi_description")
    result["kpi_description"] = kpi
    result["kpi_args"] = payload.get("kpi_args", "")
    result["kpi_function"] = payload.get("kpi_function", "")
    process_id = payload.get("bpmProcessId", payload.get("bpm_process_id"))
    node_id = payload.get("bpmNodeId", payload.get("bpm_node_id"))
    if bool(process_id) == bool(node_id):
        raise BpmDomainError(
            "Selecciona un proceso BPM o una operación BPM, pero no ambos.",
            "invalid_bpm_scope",
        )
    if process_id:
        result["bpm_process_id"] = str(process_id)
        result.pop("bpm_node_id", None)
    else:
        result["bpm_node_id"] = str(node_id)
        result.pop("bpm_process_id", None)
    return result
