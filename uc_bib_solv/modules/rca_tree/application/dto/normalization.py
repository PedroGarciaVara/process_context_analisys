"""Input normalization kept at the application boundary."""

from typing import Any
from urllib.parse import parse_qs

from uc_bib_solv.modules.platform.application.ports import ContractRef
from ...domain.exceptions import CausalTreeValidationError


def integer(value: Any) -> int | None:
    if value in (None, "", "null", []):
        return None
    return int(value)


def contract_id(value: Any) -> int | None:
    if value in (None, "", "null", []):
        return None
    return ContractRef.from_value(value).as_int()


def normalize_cause_type(value: Any) -> str:
    normalized = {
        "cause": "causa",
        "effect": "efecto",
    }.get(str(value or "causa").strip().lower(), str(value or "causa").strip().lower())
    if normalized not in {"causa", "efecto"}:
        raise CausalTreeValidationError("El tipo de causa debe ser causa o efecto.")
    return normalized


def normalize_tree_view(value: Any) -> str:
    view = str(value or "arbol")
    return view if view in {"arbol", "analisis_causas_v2"} else "arbol"


def parse_query_string(search: str | None) -> dict[str, str]:
    """Normalize query parameters at the application boundary."""
    if not search:
        return {}
    parsed = parse_qs(search.lstrip("?"), keep_blank_values=True)
    return {key: values[-1] for key, values in parsed.items() if values}
