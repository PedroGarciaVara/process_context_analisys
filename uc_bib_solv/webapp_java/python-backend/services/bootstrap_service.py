from repositories.bootstrap_repository import get_bootstrap_manifest as get_bootstrap_repository_manifest


def get_bootstrap_manifest() -> dict:
    manifest = get_bootstrap_repository_manifest()
    manifest["version"] = "block-1"
    manifest["backend"] = {
        "framework": "flask",
        "mode": "internal_dataiku",
        "bindings": {
            "dataiku_api": "deferred",
            "datasets": "deferred",
            "sql_executor2": "deferred",
            "managed_folders": "deferred",
            "project_variables": "deferred",
        },
    }
    return manifest
