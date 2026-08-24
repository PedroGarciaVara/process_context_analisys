"""HTTP adapter for the health contract."""

from flask import Blueprint

from uc_bib_solv.modules.platform.application.ports import HealthProvider
from uc_bib_solv.utils.http import ok


def create_health_blueprint(provider: HealthProvider) -> Blueprint:
    blueprint = Blueprint("health", __name__)

    @blueprint.get("/health")
    @blueprint.get("/api/health")
    def health():
        return ok(provider())

    return blueprint

