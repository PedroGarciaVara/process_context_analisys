"""Domain context records associated with BPM processes."""

from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata
from typing import Any

from .exceptions import ProcessModelingError

CONTEXT_TYPES = frozenset({"process", "version", "node", "resource", "execution", "evidence"})
RECORD_TYPES = frozenset({"declaration", "fact", "evidence"})
_MACHINE_SUFFIX = re.compile(r"(?:\s*[-–—:]\s*|\s+)(?:(?:máquina|maquina|machine)\s*(?:[A-Za-z]{1,8})?\d{1,4}|[A-Za-z]{1,8}\d{1,4})\s*$", re.IGNORECASE)


def normalize_operation_name(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ProcessModelingError("La operación requiere un nombre", "required_field")
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"\s+", " ", text).strip().casefold()
    previous = None
    while previous != text:
        previous = text
        text = _MACHINE_SUFFIX.sub("", text).strip(" -–—:")
    return text


def _merge(existing, incoming):
    if existing in (None, ""):
        return incoming
    if incoming in (None, "") or existing == incoming:
        return existing
    if isinstance(existing, dict) and isinstance(incoming, dict):
        result = dict(existing)
        for key, value in incoming.items():
            result[key] = _merge(result.get(key), value)
        return result
    if isinstance(existing, list) and isinstance(incoming, list):
        return existing + [item for item in incoming if item not in existing]
    return [existing, incoming] if not isinstance(existing, list) else existing + [incoming]


def normalize_agent_process_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ProcessModelingError("La salida del agente debe ser un objeto JSON", "invalid_agent_payload")
    result = dict(payload)
    result["process"] = payload.get("process") if isinstance(payload.get("process"), dict) else {}
    for key in ("operations", "machines", "operation_machine_assignments", "flows"):
        result[key] = payload.get(key, [])
        if not isinstance(result[key], list):
            raise ProcessModelingError(f"{key} debe ser una lista", "invalid_agent_payload")
    warnings, operations, by_key, refs = [], [], {}, {}
    for index, raw in enumerate(result["operations"], 1):
        if not isinstance(raw, dict):
            raise ProcessModelingError("Cada operación debe ser un objeto JSON", "invalid_agent_payload")
        name, key = raw.get("name"), normalize_operation_name(raw.get("name"))
        description = raw.get("description")
        if not isinstance(description, str) or not description.strip():
            if not raw.get("incomplete_reason"):
                raise ProcessModelingError(f"La operación {name!r} requiere description o incomplete_reason", "operation_description_required")
            warnings.append({"type": "incomplete_operation", "operation": name, "reason": raw["incomplete_reason"]})
            description = f"Información incompleta: {str(raw['incomplete_reason']).strip()}"
        ref = str(raw.get("temporary_id") or f"op_{index}")
        existing = by_key.get(key)
        if existing is None:
            item = dict(raw)
            item["temporary_id"], item["description"] = ref, description.strip()
            by_key[key], operations = item, operations + [item]
        elif str(existing.get("description", "")).strip().casefold() != description.strip().casefold():
            warnings.append({"type": "operation_review", "name": name, "reason": "descripciones funcionales en conflicto", "references": [existing["temporary_id"], ref]})
            item = dict(raw)
            item["temporary_id"], item["description"] = ref, description.strip()
            operations.append(item)
        else:
            for field, value in raw.items():
                if field not in {"temporary_id", "name", "description"}:
                    existing[field] = _merge(existing.get(field), value)
        refs[ref] = existing["temporary_id"] if existing is not None else ref
    machines, machine_refs, machine_by_key = [], {}, {}
    for index, raw in enumerate(result["machines"], 1):
        if not isinstance(raw, dict) or not isinstance(raw.get("name"), str) or not raw["name"].strip():
            raise ProcessModelingError("Cada máquina requiere name", "machine_name_required")
        ref, key = str(raw.get("temporary_id") or f"machine_{index}"), " ".join(raw["name"].split()).casefold()
        existing = machine_by_key.get(key)
        if existing is None:
            item = dict(raw); item["temporary_id"] = ref; machine_by_key[key] = item; machines.append(item); machine_refs[ref] = ref
        else:
            machine_refs[ref] = existing["temporary_id"]
    assignments = []
    for raw in result["operation_machine_assignments"]:
        if not isinstance(raw, dict):
            raise ProcessModelingError("Cada asignación debe ser un objeto JSON", "invalid_agent_payload")
        operation_ref, machine_ref = str(raw.get("operation_ref", "")), str(raw.get("machine_ref", ""))
        if operation_ref not in refs or machine_ref not in machine_refs:
            raise ProcessModelingError("La asignación referencia una operación o máquina inexistente", "invalid_assignment_reference")
        item = dict(raw); item["operation_ref"], item["machine_ref"] = refs[operation_ref], machine_refs[machine_ref]; assignments.append(item)
    result["operations"], result["machines"], result["operation_machine_assignments"] = operations, machines, assignments
    result["flows"] = [{key: refs.get(str(value), value) if key in {"operation_ref", "source", "target"} else value for key, value in flow.items()} for flow in result["flows"]]
    result["warnings"] = warnings
    return result


def _text(value: Any, field: str, required: bool = True) -> str | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or not value.strip():
        raise ProcessModelingError(f"{field} es obligatorio", "required_field")
    return value.strip()


@dataclass(frozen=True)
class ContextDetail:
    context_type: str
    context_id: str
    family: str
    schema_version: str
    data: dict[str, Any]
    source: dict[str, Any]
    provenance: dict[str, Any]
    extensions: dict[str, Any] | None = None

    @classmethod
    def from_payload(cls, payload: dict[str, Any], owner_id: str):
        if not isinstance(payload, dict):
            raise ProcessModelingError("El detalle debe ser un objeto JSON", "metadata_object_required")
        context_type = _text(payload.get("context_type", "node"), "context_type")
        if context_type not in CONTEXT_TYPES:
            raise ProcessModelingError("context_type no soportado", "invalid_context_type")
        values = {key: payload.get(key, {}) for key in ("data", "source", "provenance")}
        if any(not isinstance(value, dict) for value in values.values()):
            raise ProcessModelingError("data, source y provenance deben ser objetos JSON", "invalid_context_payload")
        canonical_keys = {"context_type", "context_id", "family", "schema_version", "data", "source", "provenance"}
        extensions = {key: value for key, value in payload.items() if key not in canonical_keys}
        return cls(context_type, _text(payload.get("context_id", owner_id), "context_id"), _text(payload.get("family", "general"), "family"), _text(payload.get("schema_version", "1.0"), "schema_version"), values["data"], values["source"], values["provenance"], extensions)

    def to_dict(self):
        return {**(self.extensions or {}), "context_type": self.context_type, "context_id": self.context_id, "family": self.family, "schema_version": self.schema_version, "data": self.data, "source": self.source, "provenance": self.provenance}


@dataclass(frozen=True)
class ContextRecord:
    record_type: str
    payload: dict[str, Any]
    source: dict[str, Any]
    provenance: dict[str, Any]
    execution_id: str | None = None
    supports: dict[str, Any] | None = None

    @classmethod
    def from_payload(cls, payload: dict[str, Any]):
        if not isinstance(payload, dict) or payload.get("record_type") not in RECORD_TYPES:
            raise ProcessModelingError("record_type debe ser declaration, fact o evidence", "invalid_record_type")
        values = {key: payload.get(key, {}) for key in ("payload", "source", "provenance")}
        if any(not isinstance(value, dict) for value in values.values()):
            raise ProcessModelingError("payload, source y provenance deben ser objetos JSON", "invalid_context_payload")
        supports = payload.get("supports")
        if supports is not None and not isinstance(supports, dict):
            raise ProcessModelingError("supports debe ser un objeto JSON", "invalid_context_payload")
        return cls(payload["record_type"], values["payload"], values["source"], values["provenance"], _text(payload.get("execution_id"), "execution_id", False), supports)

    def to_dict(self):
        return {"record_type": self.record_type, "payload": self.payload, "source": self.source, "provenance": self.provenance, "execution_id": self.execution_id, "supports": self.supports}


def calculate_kpi(values: list[float], *, version: str, source: dict[str, Any] | None = None):
    if not values:
        raise ProcessModelingError("values debe contener al menos un valor", "kpi_inputs_required")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in values):
        raise ProcessModelingError("values solo admite números", "invalid_kpi_input")
    return {"value": sum(values) / len(values), "metric": "mean", "inputs": {"values": values}, "version": _text(version, "version"), "provenance": source or {"kind": "on_demand"}}
