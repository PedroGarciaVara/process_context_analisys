from __future__ import annotations

from app.persistence.db import db_cursor


def create(nombre: str) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre del proceso es obligatorio.")
    with db_cursor() as cur:
        cur.execute("INSERT INTO proceso(nombre) VALUES (%s) RETURNING id, nombre", (nombre.strip(),))
        return dict(cur.fetchone())


def get_all() -> list[dict]:
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre FROM proceso ORDER BY id")
        return [dict(r) for r in cur.fetchall()]


def get_by_id(proceso_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre FROM proceso WHERE id=%s", (proceso_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def update(proceso_id: int, nombre: str) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre del proceso es obligatorio.")
    with db_cursor() as cur:
        cur.execute("UPDATE proceso SET nombre=%s WHERE id=%s RETURNING id, nombre", (nombre.strip(), proceso_id))
        row = cur.fetchone()
        if not row:
            raise ValueError("Proceso no encontrado.")
        return dict(row)


def delete(proceso_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS total FROM contrato WHERE proceso_id=%s", (proceso_id,))
        total = cur.fetchone()["total"]
        if total > 0:
            raise ValueError("No se puede eliminar el proceso porque tiene contratos asociados.")
        cur.execute("DELETE FROM proceso WHERE id=%s", (proceso_id,))
        return cur.rowcount > 0

