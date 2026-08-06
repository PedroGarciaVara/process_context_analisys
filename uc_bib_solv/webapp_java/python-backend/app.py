from __future__ import annotations

import sys
from pathlib import Path

from flask import Flask

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[2]
for path in (BASE_DIR, PROJECT_ROOT):
    if str(path) in sys.path:
        sys.path.remove(str(path))
    sys.path.insert(0, str(path))

from routes.causas import bp as causas_bp
from routes.bootstrap import bp as bootstrap_bp
from routes.health import bp as health_bp
from routes.operational import bp as operational_bp
from routes.analysis import bp as analysis_bp
from routes.process_modeling import bp as process_modeling_bp


def create_app() -> Flask:
    application = Flask(__name__)
    application.register_blueprint(health_bp)
    application.register_blueprint(bootstrap_bp)
    application.register_blueprint(operational_bp)
    application.register_blueprint(causas_bp)
    application.register_blueprint(analysis_bp)
    application.register_blueprint(process_modeling_bp)

    @application.get("/")
    def root():
        return {
            "status": "ok",
            "message": "UC_BIB_Solve webapp Java backend",
            "endpoints": [
                "/health",
                "/bootstrap",
                "/causas",
                "/api/health",
                "/api/bootstrap",
                "/api/operational/catalog",
                "/api/operational/page/<page>",
                "/api/operational/processes",
                "/api/operational/processes/<process_id>",
                "/api/operational/contracts",
                "/api/operational/contracts/<contract_id>",
                "/api/operational/machines",
                "/api/operational/machines/<machine_id>",
                "/api/operational/machines/<machine_id>/context",
                "/api/operational/machines/<machine_id>/configurations",
                "/api/causas",
                "/api/causas/detail",
                "/api/causas/<causa_id>",
                "/api/causas/<causa_id>/hipotesis",
                "/api/hipotesis/<hipotesis_id>/delete-preview",
                "/api/process-modeling/processes",
                "/api/process-modeling/processes/<process_id>/versions",
                "/api/process-modeling/versions/<version_id>",
            ],
        }

    return application


app = create_app()

server = app


if __name__ == "__main__":
    app.run(debug=True)
