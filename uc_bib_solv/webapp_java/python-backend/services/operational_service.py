from repositories.operational_repository import (
    get_operational_catalog as get_operational_repository_catalog,
    get_operational_page_payload as get_operational_repository_page_payload,
)


def get_operational_catalog() -> dict:
    return get_operational_repository_catalog()


def get_operational_page_payload(page: str, params: dict[str, str] | None = None) -> dict:
    return get_operational_repository_page_payload(page, params)
