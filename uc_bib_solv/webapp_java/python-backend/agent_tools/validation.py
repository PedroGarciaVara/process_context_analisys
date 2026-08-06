from __future__ import annotations

from typing import Any, Mapping

from .errors import AgentToolError


def object_args(arguments: Mapping[str, Any] | None) -> dict[str, Any]:
    if arguments is None:
        return {}
    if not isinstance(arguments, Mapping):
        raise AgentToolError("arguments debe ser un objeto JSON", "invalid_arguments")
    return dict(arguments)


def required(args: Mapping[str, Any], *names: str) -> None:
    missing = [name for name in names if args.get(name) in (None, "")]
    if missing:
        raise AgentToolError(f"Faltan argumentos obligatorios: {', '.join(missing)}", "required_argument")


def optional_int(args: Mapping[str, Any], name: str) -> int | None:
    value = args.get(name)
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise AgentToolError(f"{name} debe ser un entero", "invalid_argument") from exc
