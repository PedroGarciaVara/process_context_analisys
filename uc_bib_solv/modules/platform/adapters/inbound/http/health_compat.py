"""Legacy import facade for the platform health adapter."""

from uc_bib_solv.modules.platform.adapters.inbound.http import create_health_blueprint
from uc_bib_solv.modules.platform.infrastructure.wiring import get_health_payload

bp = create_health_blueprint(get_health_payload)
