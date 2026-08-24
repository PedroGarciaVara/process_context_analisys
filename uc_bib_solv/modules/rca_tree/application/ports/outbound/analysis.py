"""Outbound ports for causal-analysis persistence."""

from typing import Any, Protocol


class AnalysisRepositoryPort(Protocol):
    def list_recent(self, limit: int = 20, status: str | None = None, search: str | None = None) -> list[dict[str, Any]]: ...

    def list_templates(self, process_id: int | None = None) -> list[dict[str, Any]]: ...

    def create(self, payload: dict[str, Any]) -> dict[str, Any]: ...

    def get(self, analysis_id: int) -> dict[str, Any] | None: ...

    def update(self, analysis_id: int, payload: dict[str, Any]) -> dict[str, Any]: ...


class ParticipantRepositoryPort(Protocol):
    def list_for_analysis(self, analysis_id: int) -> list[str]: ...

    def add(self, analysis_id: int, participant: str) -> dict[str, Any]: ...


class ResultRepositoryPort(Protocol):
    def save(self, analysis_id: int, payload: dict[str, Any]) -> dict[str, Any]: ...

    def list_for_analysis(self, analysis_id: int) -> list[dict[str, Any]]: ...


__all__ = ["AnalysisRepositoryPort", "ParticipantRepositoryPort", "ResultRepositoryPort"]
