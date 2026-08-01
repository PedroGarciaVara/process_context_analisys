from __future__ import annotations

from app.persistence.db import db_cursor


def create(nombre: str) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre de la máquina es obligatorio.")
    with db_cursor() as cur:
        cur.execute("INSERT INTO maquina(nombre) VALUES (%s) RETURNING id, nombre", (nombre.strip(),))
        return dict(cur.fetchone())


def get_all() -> list[dict]:
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre FROM maquina ORDER BY id")
        return [dict(r) for r in cur.fetchall()]


def get_by_id(maquina_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre FROM maquina WHERE id=%s", (maquina_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def update(maquina_id: int, nombre: str) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre de la máquina es obligatorio.")
    with db_cursor() as cur:
        cur.execute("UPDATE maquina SET nombre=%s WHERE id=%s RETURNING id, nombre", (nombre.strip(), maquina_id))
        row = cur.fetchone()
        if not row:
            raise ValueError("Máquina no encontrada.")
        return dict(row)


def delete(maquina_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute("DELETE FROM maquina WHERE id=%s", (maquina_id,))
        return cur.rowcount > 0

