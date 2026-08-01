from flask import Blueprint

from services.health_service import get_health_payload
from utils.http import ok

bp = Blueprint("health", __name__)


@bp.get("/health")
@bp.get("/api/health")
def health():
    return ok(get_health_payload())
