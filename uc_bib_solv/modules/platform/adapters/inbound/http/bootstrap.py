"""HTTP adapter for the bootstrap manifest contract."""

from flask import Blueprint

from uc_bib_solv.modules.platform.application.ports import BootstrapProvider
from uc_bib_solv.utils.http import ok


def create_bootstrap_blueprint(provider: BootstrapProvider) -> Blueprint:
    blueprint = Blueprint("bootstrap", __name__)

    @blueprint.get("/bootstrap")
    @blueprint.get("/api/bootstrap")
    def bootstrap():
        return ok(provider())

    return blueprint

