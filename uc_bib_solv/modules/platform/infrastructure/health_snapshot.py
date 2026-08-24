def get_health_snapshot() -> dict:
    return {
        "service": "uc_bib_solv-webapp_java",
        "status": "ok",
        "ready": True,
        "checks": {
            "routes": "registered",
            "dataiku_bindings": "deferred",
            "datasets": "deferred",
            "sql_executor2": "deferred",
            "managed_folders": "deferred",
            "project_variables": "deferred",
        },
    }
