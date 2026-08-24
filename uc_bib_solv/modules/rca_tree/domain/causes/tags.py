"""Cause tag normalization rules."""

from __future__ import annotations

from collections.abc import Iterable

from ..value_objects import CauseTag


def normalize_tags(tags: str | Iterable[str] | None) -> list[str]:
    values = [tags] if isinstance(tags, str) else list(tags or [])
    normalized = {
        CauseTag(value).value
        for value in values
        if value is not None and str(value).strip().lower() in CauseTag.ALLOWED
    }
    return [value for value in CauseTag.ALLOWED if value in normalized]
