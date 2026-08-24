"""Legacy import facade for the platform bootstrap adapter."""

from uc_bib_solv.modules.platform.adapters.inbound.http import create_bootstrap_blueprint
from uc_bib_solv.modules.platform.infrastructure.wiring import get_bootstrap_manifest

bp = create_bootstrap_blueprint(get_bootstrap_manifest)
