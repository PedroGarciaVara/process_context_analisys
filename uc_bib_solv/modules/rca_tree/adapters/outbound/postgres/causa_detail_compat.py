from __future__ import annotations

from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import causa_repo, hipotesis_repo


def get_causa(causa_id: int) -> dict | None:
    return causa_repo.get_by_id(int(causa_id))


def get_hypothesis(hipotesis_id: int) -> dict | None:
    return hipotesis_repo.get_by_id(int(hipotesis_id))


def list_hypotheses_for_causa(causa_id: int) -> list[dict]:
    return hipotesis_repo.get_by_causa(int(causa_id))


def create_causa(
    contrato_id: int,
    nombre: str,
    descripcion: str | None = None,
    tipo: str = "causa",
    categoria: str | None = None,
    parent_id: int | None = None,
) -> dict:
    return causa_repo.create(
        int(contrato_id),
        nombre,
        descripcion,
        tipo,
        categoria,
        parent_id=parent_id,
    )


def update_causa(
    causa_id: int,
    nombre: str,
    descripcion: str | None = None,
    tipo: str = "causa",
    categoria: str | None = None,
) -> dict:
    return causa_repo.update(int(causa_id), nombre, descripcion, tipo, categoria)


def create_hypothesis(
    causa_id: int,
    descripcion: str,
    tipo: str = "aceptacion",
    criterio_validacion: str | None = None,
    estado: str = "pendiente",
    **kwargs,
) -> dict:
    return hipotesis_repo.create(int(causa_id), descripcion, tipo, criterio_validacion, estado, **kwargs)


def update_hypothesis(
    hipotesis_id: int,
    descripcion: str,
    tipo: str,
    criterio_validacion: str | None,
    estado: str,
    **kwargs,
) -> dict:
    return hipotesis_repo.update(int(hipotesis_id), descripcion, tipo, criterio_validacion, estado, **kwargs)


def delete_hypothesis(hipotesis_id: int) -> bool:
    return hipotesis_repo.delete(int(hipotesis_id))
