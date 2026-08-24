"""Reversible Flask application factory for legacy and platform startup."""

from __future__ import annotations

from pathlib import Path

from flask import Flask, send_from_directory

from uc_bib_solv.modules.platform.infrastructure.config import PlatformConfig
from uc_bib_solv.modules.platform.infrastructure.wiring import create_platform_blueprints
from uc_bib_solv.modules.bpm.adapters.inbound.http.operational_compat import bp as operational_compat_bp
from uc_bib_solv.modules.bpm.adapters.inbound.http.process_modeling import create_blueprint as create_bpm_blueprint
from uc_bib_solv.modules.bpm.adapters.inbound.http.process_modeling_compat import create_process_modeling_blueprint
from uc_bib_solv.modules.bpm.infrastructure.process_modeling_wiring import create_process_modeling_handlers
from uc_bib_solv.modules.rca_tree.adapters.inbound.http.analysis_compat import bp as legacy_analysis_bp
from uc_bib_solv.modules.rca_tree.adapters.inbound.http.causas_compat import bp as causas_bp
from uc_bib_solv.modules.bpm.infrastructure.wiring import build_bpm_operational_service
from uc_bib_solv.modules.rca_tree.adapters.inbound.http.routes import create_blueprint as create_rca_tree_blueprint
from uc_bib_solv.modules.rca_tree.infrastructure.wiring import build_rca_tree_service
from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import build_rca_tree_analysis_service


process_modeling_service = create_process_modeling_handlers()
process_modeling_bp = create_process_modeling_blueprint(process_modeling_service)
bpm_bp = create_bpm_blueprint(
    build_bpm_operational_service(),
    process_modeling_service,
)


def create_app(*, serve_webapp: bool = False, webapp_dir: Path | None = None) -> Flask:
    application = Flask(__name__)
    for blueprint in create_platform_blueprints():
        application.register_blueprint(blueprint)
    rca_tree_bp = create_rca_tree_blueprint(
        build_rca_tree_service(),
        analysis_service=build_rca_tree_analysis_service(),
    )
    for blueprint in (operational_compat_bp, causas_bp, legacy_analysis_bp, process_modeling_bp, bpm_bp, rca_tree_bp):
        application.register_blueprint(blueprint)

    if serve_webapp:
        static_dir = webapp_dir or Path(__file__).resolve().parents[3] / "webapp"

        @application.get("/")
        def serve_index():
            return send_from_directory(static_dir, "index.html")

        @application.get("/<path:path>")
        def serve_spa(path: str):
            if path.startswith(("api/", "health", "bootstrap")):
                return "", 404
            candidate = static_dir / path
            if candidate.exists() and candidate.is_file():
                return send_from_directory(static_dir, path)
            return send_from_directory(static_dir, "index.html")
    else:
        @application.get("/")
        def root():
            return {
                "status": "ok",
                "message": "UC_BIB_Solve webapp Java backend",
                "endpoints": [
                    "/health", "/bootstrap", "/causas", "/api/health", "/api/bootstrap",
                    "/api/operational/catalog", "/api/operational/page/<page>",
                    "/api/operational/processes", "/api/operational/processes/<process_id>",
                    "/api/operational/contracts", "/api/operational/contracts/<contract_id>",
                    "/api/operational/machines", "/api/operational/machines/<machine_id>",
                    "/api/operational/machines/<machine_id>/context",
                    "/api/operational/machines/<machine_id>/configurations",
                    "/api/causas", "/api/causas/detail", "/api/causas/<causa_id>",
                    "/api/causas/<causa_id>/hipotesis", "/api/hipotesis/<hipotesis_id>/delete-preview",
                    "/api/process-modeling/processes", "/api/process-modeling/processes/<process_id>", "/api/process-modeling/processes/<process_id>/versions",
                    "/api/process-modeling/versions/<version_id>",
                    "/api/bpm/processes", "/api/bpm/operations", "/api/bpm/machines", "/api/bpm/contracts",
                    "/api/rca-tree/nodes", "/api/rca-tree/causes", "/api/rca-tree/analyses",
                ],
            }
    return application


def run_app(application: Flask, config: PlatformConfig | None = None) -> None:
    settings = config or PlatformConfig.from_environment()
    application.run(host=settings.host, port=settings.port, debug=settings.debug, use_reloader=settings.use_reloader)
