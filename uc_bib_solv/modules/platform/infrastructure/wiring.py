"""Explicit platform composition and legacy provider bindings."""

from uc_bib_solv.modules.platform.adapters.inbound.http import create_bootstrap_blueprint, create_health_blueprint
from .bootstrap_service import get_bootstrap_manifest
from .health_service import get_health_payload

__all__ = ["create_platform_blueprints", "get_bootstrap_manifest", "get_health_payload"]


def create_platform_blueprints():
    """Build platform inbound adapters with the current provider implementations."""
    return (
        create_health_blueprint(get_health_payload),
        create_bootstrap_blueprint(get_bootstrap_manifest),
    )
