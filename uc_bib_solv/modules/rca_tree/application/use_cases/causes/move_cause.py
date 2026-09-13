"""Move a cause while preserving its identity and scientific references."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from ....domain.causal_graph.rules import (
    normalize_expected_version,
    validate_expected_version,
    validate_move_reason,
    validate_reparenting_invariants,
)
from ....domain.exceptions import CausalTreeNotFoundError, CausalTreeValidationError
from ...ports.outbound.causal_repositories import CausalReparentingPort


@dataclass(frozen=True)
class MoveCauseCommand:
    cause_id: int
    parent_id: int | None
    expected_version: int | str
    reason: str
    actor_id: str | None = None
    correlation_id: str | None = None

    @classmethod
    def from_payload(cls, payload: dict[str, Any], *, cause_id: int | None = None) -> "MoveCauseCommand":
        raw_id = cause_id if cause_id is not None else payload.get("cause_id", payload.get("causa_id"))
        try:
            resolved_id = int(raw_id)
        except (TypeError, ValueError) as exc:
            raise CausalTreeValidationError("Se requiere una causa válida para moverla.") from exc
        raw_parent = payload.get("parent_id")
        try:
            parent = None if raw_parent in (None, "", "null") else int(raw_parent)
        except (TypeError, ValueError) as exc:
            raise CausalTreeValidationError("El padre debe ser un entero o null.") from exc
        try:
            version = normalize_expected_version(payload.get("expected_version"))
        except ValueError as exc:
            raise CausalTreeValidationError(str(exc)) from exc
        return cls(
            cause_id=resolved_id,
            parent_id=parent,
            expected_version=version,
            reason=validate_move_reason(payload.get("reason")),
            actor_id=payload.get("actor_id"),
            correlation_id=payload.get("correlation_id"),
        )


@dataclass(frozen=True)
class MoveCauseResult:
    cause: dict[str, Any]
    moved_from: dict[str, Any]
    moved_to: dict[str, Any]
    affected_descendant_ids: list[int] = field(default_factory=list)
    primary_relationship: dict[str, Any] = field(default_factory=dict)
    preserved: dict[str, list[int]] = field(default_factory=dict)
    audit: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


class MoveCause:
    """Application interactor; persistence remains an atomic outbound port."""

    def __init__(self, reparenting: CausalReparentingPort):
        self.reparenting = reparenting

    def execute(self, payload: dict[str, Any] | MoveCauseCommand, *, cause_id: int | None = None) -> dict[str, Any]:
        command = payload if isinstance(payload, MoveCauseCommand) else MoveCauseCommand.from_payload(payload, cause_id=cause_id)
        context = self.reparenting.get_move_context(command.cause_id, command.parent_id)
        cause = context.get("cause") or context.get("current_cause")
        if not cause:
            raise CausalTreeNotFoundError("La causa indicada no existe.", details={"cause_id": command.cause_id})
        parent = context.get("parent") or context.get("new_parent")
        validate_expected_version(command.expected_version, cause.get("version", context.get("version")))
        validate_reparenting_invariants(
            cause=cause,
            parent=parent,
            edges=context.get("edges", context.get("structural_edges", ())),
            root_id=context.get("root_id"),
            allow_null_parent=bool(context.get("allow_null_parent", False)),
            existing_root_id=context.get("existing_root_id"),
            primary_relationships=context.get("primary_relationships", ()),
        )
        mover = getattr(self.reparenting, "move_cause", None) or getattr(self.reparenting, "reparent", None)
        if mover is None:
            raise CausalTreeValidationError("El puerto de reparenting no expone una operación atómica.")
        raw_result = mover(command)
        if not raw_result:
            raise CausalTreeValidationError("El repositorio no devolvió el resultado del movimiento.")
        result = dict(raw_result)
        result.setdefault("moved_from", {"parent_id": cause.get("parent_id")})
        result.setdefault("moved_to", {"parent_id": command.parent_id})
        result.setdefault("affected_descendant_ids", list(context.get("affected_descendant_ids", ())))
        result.setdefault("preserved", context.get("preserved", {}))
        return result


__all__ = ["MoveCause", "MoveCauseCommand", "MoveCauseResult"]
