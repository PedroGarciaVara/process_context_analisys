from __future__ import annotations

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


def create(nombre: str) -> dict:
    raise ValueError("Los procesos deben crearse desde el modelado BPM.")


def get_all() -> list[dict]:
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre, bpm_process_id FROM proceso ORDER BY id")
        return [dict(r) for r in cur.fetchall()]


def get_by_id(proceso_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre, bpm_process_id FROM proceso WHERE id=%s", (proceso_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def update(proceso_id: int, nombre: str) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre del proceso es obligatorio.")
    raise ValueError("El nombre del proceso se actualiza desde el modelado BPM.")


def delete(proceso_id: int) -> bool:
    raise ValueError("Los procesos se eliminan desde el modelado BPM.")
