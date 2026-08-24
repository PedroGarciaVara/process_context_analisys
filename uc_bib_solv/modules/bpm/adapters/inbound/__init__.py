"""Inbound BPM adapters."""

from .http.routes import create_blueprint

__all__ = ["create_blueprint"]
