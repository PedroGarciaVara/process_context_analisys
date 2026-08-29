"""Reversible Flask application factory for legacy and platform startup."""

from __future__ import annotations

from pathlib import Path

from flask import Flask

from uc_bib_solv.modules.platform.adapters.inbound.http import create_root_blueprint
from uc_bib_solv.modules.platform.infrastructure.config import PlatformConfig
from uc_bib_solv.modules.platform.infrastructure.wiring import build_platform_contract_context, create_platform_blueprints
from uc_bib_solv.modules.bpm.adapters.inbound.http.process_modeling import create_blueprint as create_bpm_blueprint
from uc_bib_solv.modules.bpm.infrastructure.process_modeling_wiring import create_process_modeling_handlers
from uc_bib_solv.modules.bpm.infrastructure.wiring import build_bpm_operational_service
from uc_bib_solv.modules.rca_tree.adapters.inbound.http.routes import create_blueprint as create_rca_tree_blueprint
from uc_bib_solv.modules.rca_tree.infrastructure.wiring import build_rca_tree_application
from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import build_rca_tree_analysis_application


def create_app(*, serve_webapp: bool = False, webapp_dir: Path | None = None) -> Flask:
    application = Flask(__name__)
    static_dir = webapp_dir or Path(__file__).resolve().parents[3] / "webapp"
    process_modeling = create_process_modeling_handlers()
    bpm_blueprint = create_bpm_blueprint(build_bpm_operational_service(), process_modeling)
    for blueprint in create_platform_blueprints():
        application.register_blueprint(blueprint)
    rca_tree_bp = create_rca_tree_blueprint(
        build_rca_tree_application(contract_context=build_platform_contract_context()),
        analysis_service=build_rca_tree_analysis_application(),
    )
    for blueprint in (
        create_root_blueprint(serve_webapp=serve_webapp, static_dir=static_dir),
        bpm_blueprint,
        rca_tree_bp,
    ):
        application.register_blueprint(blueprint)
    return application


def run_app(application: Flask, config: PlatformConfig | None = None) -> None:
    settings = config or PlatformConfig.from_environment()
    application.run(host=settings.host, port=settings.port, debug=settings.debug, use_reloader=settings.use_reloader)
