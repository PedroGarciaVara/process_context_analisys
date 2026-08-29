"""Causal analysis entities and state rules."""

from __future__ import annotations

from dataclasses import dataclass, field
from ..exceptions import CausalTreeStateError, CausalTreeValidationError


ANALYSIS_STATES = ("abierto", "cerrado")
RESULT_TYPES = ("causa", "hipotesis")
CAUSE_EVALUATIONS = ("retenida", "evaluada")
HYPOTHESIS_EVALUATIONS = ("validada", "rechazada")


def normalize_state(value: str | None) -> str:
    state = (value or "abierto").strip().lower()
    if state not in ANALYSIS_STATES:
        raise CausalTreeValidationError(f"Estado de análisis inválido: {value!r}")
    return state


def validate_transition(current: str, requested: str) -> str:
    current_state, requested_state = normalize_state(current), normalize_state(requested)
    if current_state == requested_state or {current_state, requested_state} == {"abierto", "cerrado"}:
        return requested_state
    raise CausalTreeStateError(f"Transición de análisis no permitida: {current!r} -> {requested!r}")


def normalize_result_type(value: str | None) -> str:
    result_type = (value or "").strip().lower()
    if result_type not in RESULT_TYPES:
        raise CausalTreeValidationError("element_type debe ser causa o hipotesis.")
    return result_type


def validate_evaluation(result_type: str, evaluation: str) -> str:
    normalized_type = normalize_result_type(result_type)
    normalized = (evaluation or "").strip().lower()
    allowed = CAUSE_EVALUATIONS if normalized_type == "causa" else HYPOTHESIS_EVALUATIONS
    if normalized not in allowed:
        raise CausalTreeValidationError(f"Evaluación de {normalized_type} inválida: {evaluation!r}")
    return normalized


@dataclass(frozen=True)
class Analysis:
    id: int | None
    contract_id: int
    process_id: int | None
    machine_id: int | None
    initializer: str
    opening_description: str
    state: str = "abierto"
    participants: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        if self.contract_id <= 0 or not self.initializer.strip() or not self.opening_description.strip():
            raise CausalTreeValidationError("El análisis requiere contrato, participante e indicio de apertura.")
        normalize_state(self.state)


@dataclass(frozen=True)
class AnalysisParticipant:
    analysis_id: int
    name: str

    def __post_init__(self) -> None:
        if self.analysis_id <= 0 or not self.name.strip():
            raise CausalTreeValidationError("El participante del análisis es obligatorio.")


@dataclass(frozen=True)
class AnalysisResult:
    analysis_id: int
    result_type: str
    cause_id: int | None = None
    hypothesis_id: int | None = None
    evidence: str | None = None
    conclusion: str | None = None
    evaluation: str = "pendiente"

    def __post_init__(self) -> None:
        result_type = normalize_result_type(self.result_type)
        if result_type == "causa" and (self.cause_id is None or self.hypothesis_id is not None):
            raise CausalTreeValidationError("Falta la identidad del resultado.")
        if result_type == "hipotesis" and (self.hypothesis_id is None or self.cause_id is not None):
            raise CausalTreeValidationError("Falta la identidad del resultado.")
        if self.analysis_id <= 0:
            raise CausalTreeValidationError("El análisis es obligatorio.")
