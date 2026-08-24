"""Framework-neutral contracts consumed by platform inbound adapters."""

from typing import Protocol


class HealthProvider(Protocol):
    def __call__(self) -> dict: ...


class BootstrapProvider(Protocol):
    def __call__(self) -> dict: ...

