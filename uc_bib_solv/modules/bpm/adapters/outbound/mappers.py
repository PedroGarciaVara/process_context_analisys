"""Row mappers for BPM operational projections."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


class BpmOperationalMapper:
    """Normalize persistence rows at the BPM outbound boundary."""

    @staticmethod
    def row(value: Any) -> Any:
        if isinstance(value, Mapping):
            result = {str(key): BpmOperationalMapper.row(item) for key, item in value.items()}
            result.pop("operational_status", None)
            return result
        if isinstance(value, list):
            return [BpmOperationalMapper.row(item) for item in value]
        if isinstance(value, tuple):
            return [BpmOperationalMapper.row(item) for item in value]
        return value

    @classmethod
    def machine(cls, value: Any) -> Any:
        result = cls.row(value)
        if isinstance(result, dict):
            result.pop("operational_status", None)
        return result

    @classmethod
    def machines(cls, values: Any) -> Any:
        return [cls.machine(value) for value in values] if isinstance(values, list) else cls.machine(values)

    @classmethod
    def process(cls, value: Any) -> Any:
        return cls.row(value)

    @classmethod
    def contract(cls, value: Any) -> Any:
        return cls.row(value)


__all__ = ["BpmOperationalMapper"]
