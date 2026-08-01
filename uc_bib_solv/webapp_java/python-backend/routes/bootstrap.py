from flask import Blueprint

from services.bootstrap_service import get_bootstrap_manifest
from utils.http import ok

bp = Blueprint("bootstrap", __name__)


@bp.get("/bootstrap")
@bp.get("/api/bootstrap")
def bootstrap():
    return ok(get_bootstrap_manifest())
