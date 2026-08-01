from repositories.health_repository import get_health_snapshot


def get_health_payload() -> dict:
    snapshot = get_health_snapshot()
    return {
        "app_name": "UC_BIB_Solve",
        "boundary": "uc_bib_solv/webapp_java",
        **snapshot,
    }
