from __future__ import annotations

import os
import sys
from pathlib import Path

from flask import Flask, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[1]
BACKEND_DIR = BASE_DIR / "python-backend"
WEBAPP_DIR = BASE_DIR / "webapp"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(1, str(BACKEND_DIR))

from routes.bootstrap import bp as bootstrap_bp  # noqa: E402
from routes.causas import bp as causas_bp  # noqa: E402
from routes.health import bp as health_bp  # noqa: E402
from routes.operational import bp as operational_bp  # noqa: E402
from routes.analysis import bp as analysis_bp  # noqa: E402
from routes.process_modeling import bp as process_modeling_bp  # noqa: E402


def create_app() -> Flask:
    application = Flask(__name__)
    application.register_blueprint(health_bp)
    application.register_blueprint(bootstrap_bp)
    application.register_blueprint(operational_bp)
    application.register_blueprint(causas_bp)
    application.register_blueprint(analysis_bp)
    application.register_blueprint(process_modeling_bp)

    @application.get("/")
    def serve_index():
        return send_from_directory(WEBAPP_DIR, "index.html")

    @application.get("/<path:path>")
    def serve_spa(path: str):
        if path.startswith(("api/", "health", "bootstrap")):
            return "", 404

        candidate = WEBAPP_DIR / path
        if candidate.exists() and candidate.is_file():
            return send_from_directory(WEBAPP_DIR, path)

        return send_from_directory(WEBAPP_DIR, "index.html")

    return application


app = create_app()


def main() -> None:
    host = os.environ.get("WEBAPP_JAVA_HOST", "127.0.0.1")
    port = int(os.environ.get("WEBAPP_JAVA_PORT", "8050"))
    debug = os.environ.get("WEBAPP_JAVA_DEBUG", "0").strip() not in {"0", "false", "False"}
    app.run(host=host, port=port, debug=debug, use_reloader=False)


if __name__ == "__main__":
    main()
