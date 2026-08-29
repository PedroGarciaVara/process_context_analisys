"""Flask HTTP adapters for platform endpoints."""

from .bootstrap import create_bootstrap_blueprint
from .health import create_health_blueprint
from .root import create_root_blueprint

__all__ = ["create_bootstrap_blueprint", "create_health_blueprint", "create_root_blueprint"]
