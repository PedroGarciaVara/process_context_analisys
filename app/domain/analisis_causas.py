"""Reglas de dominio para sesiones de análisis causal y trazabilidad."""

from __future__ import annotations

from dataclasses import dataclass


ESTADOS_ANALISIS = ("abierto", "cerrado")
EVALUACIONES_CAUSA = ("retenida", "evaluada")
EVALUACIONES_HIPOTESIS = ("validada", "rechazada")


@dataclass(frozen=True)
class AnalisisCausasSnapshot:
    id: int | None
    contrato_id: int
    proceso_id: int | None
    maquina_id: int | None
    persona_inicializacion: str
    descripcion_apertura: str
    estado: str


def normalize_estado_analisis(estado: str | None) -> str:
    candidate = (estado or "abierto").strip().lower()
    if candidate not in ESTADOS_ANALISIS:
        raise ValueError(f"Estado de análisis inválido: {estado!r}")
    return candidate


def validate_analisis_transition(estado_actual: str, nuevo_estado: str) -> str:
    actual = normalize_estado_analisis(estado_actual)
    nuevo = normalize_estado_analisis(nuevo_estado)
    if actual == nuevo:
        return nuevo
    if actual == "cerrado" and nuevo == "abierto":
        return nuevo
    if actual == "abierto" and nuevo == "cerrado":
        return nuevo
    raise ValueError(f"Transición de análisis no permitida: {actual!r} -> {nuevo!r}")


def validate_evaluacion(tipo_elemento: str, evaluacion: str) -> str:
    tipo = (tipo_elemento or "").strip().lower()
    evaluacion_normalizada = (evaluacion or "").strip().lower()
    if tipo == "causa":
        if evaluacion_normalizada not in EVALUACIONES_CAUSA:
            raise ValueError(f"Evaluación de causa inválida: {evaluacion!r}")
        return evaluacion_normalizada
    if tipo == "hipotesis":
        if evaluacion_normalizada not in EVALUACIONES_HIPOTESIS:
            raise ValueError(f"Evaluación de hipótesis inválida: {evaluacion!r}")
        return evaluacion_normalizada
    raise ValueError(f"Tipo de elemento inválido: {tipo_elemento!r}")
