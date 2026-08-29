"""Explicit platform composition and legacy provider bindings."""

from uc_bib_solv.modules.platform.adapters.inbound.http import create_bootstrap_blueprint, create_health_blueprint
from .bootstrap_service import get_bootstrap_manifest
from .health_service import get_health_payload
from uc_bib_solv.modules.platform.adapters.bpm_contract_context import (
    BpmContractContextAdapter,
)
from uc_bib_solv.modules.bpm.infrastructure.wiring import build_bpm_contract_context_port

__all__ = ["create_platform_blueprints", "get_bootstrap_manifest", "get_health_payload", "build_platform_contract_context"]


def build_platform_contract_context() -> BpmContractContextAdapter:
    return BpmContractContextAdapter(build_bpm_contract_context_port())


def create_platform_blueprints():
    """Build platform inbound adapters with the current provider implementations."""
    return (
        create_health_blueprint(get_health_payload),
        create_bootstrap_blueprint(get_bootstrap_manifest),
    )
