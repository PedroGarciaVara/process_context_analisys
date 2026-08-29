"""HTTP adapter for the application root and optional SPA static serving."""

from __future__ import annotations

from pathlib import Path

from flask import Blueprint, send_from_directory


def create_root_blueprint(*, serve_webapp: bool = False, static_dir: Path | None = None) -> Blueprint:
    """Build the single root surface used by local and backend entrypoints."""
    blueprint = Blueprint("root", __name__)
    resolved_static_dir = static_dir

    @blueprint.get("/")
    def root():
        if serve_webapp:
            return send_from_directory(resolved_static_dir, "index.html")
        return {
            "status": "ok",
            "message": "UC_BIB_Solve webapp Java backend",
            "endpoints": [
                "/health", "/bootstrap", "/causas", "/api/health", "/api/bootstrap",
                "/api/bpm/operational/catalog", "/api/bpm/operational/page/<page>",
                "/api/bpm/operational/processes", "/api/bpm/operational/processes/<process_id>",
                "/api/bpm/contracts", "/api/bpm/contracts/<contract_id>",
                "/api/bpm/machines", "/api/bpm/machines/<machine_id>",
                "/api/bpm/machines/<machine_id>/context",
                "/api/bpm/machines/<machine_id>/configurations",
                "/api/rca-tree/nodes", "/api/rca-tree/causes/detail", "/api/rca-tree/causes/<cause_id>",
                "/api/rca-tree/causes/<cause_id>/hypotheses", "/api/rca-tree/hypotheses/<hypothesis_id>/delete-preview",
                "/api/bpm/processes", "/api/bpm/processes/<process_id>",
                "/api/bpm/processes/<process_id>/nodes",
                "/api/bpm/processes/<process_id>/transitions",
                "/api/bpm/processes", "/api/bpm/operations", "/api/bpm/machines", "/api/bpm/contracts",
                "/api/rca-tree/nodes", "/api/rca-tree/causes", "/api/rca-tree/analyses",
            ],
        }

    if serve_webapp:
        @blueprint.get("/<path:path>")
        def serve_spa(path: str):
            if path.startswith(("api/", "health", "bootstrap")):
                return "", 404
            candidate = resolved_static_dir / path
            if candidate.exists() and candidate.is_file():
                return send_from_directory(resolved_static_dir, path)
            return send_from_directory(resolved_static_dir, "index.html")

    return blueprint
