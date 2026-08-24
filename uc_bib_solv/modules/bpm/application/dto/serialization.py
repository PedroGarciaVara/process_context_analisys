"""Serialization helpers for application responses."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID


def jsonable(value):
    if isinstance(value, (UUID, datetime, date)):
        return str(value)
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [jsonable(item) for item in value]
    return value


__all__ = ["jsonable"]
