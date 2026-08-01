from __future__ import annotations

from app.persistence.db import db_cursor


def create(proceso_id: int, nombre: str, metrica: str | None = None, objetivo: str | None = None) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre del contrato es obligatorio.")
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO contrato(proceso_id, nombre, metrica, objetivo)
            VALUES (%s, %s, %s, %s)
            RETURNING id, proceso_id, nombre, metrica, objetivo, version, activo
            """,
            (proceso_id, nombre.strip(), metrica, objetivo),
        )
        return dict(cur.fetchone())


def get_all(activo: bool | None = None) -> list[dict]:
    with db_cursor() as cur:
        if activo is None:
            cur.execute(
                "SELECT id, proceso_id, nombre, metrica, objetivo, version, activo FROM contrato ORDER BY id"
            )
        else:
            cur.execute(
                """
                SELECT id, proceso_id, nombre, metrica, objetivo, version, activo
                FROM contrato WHERE activo=%s ORDER BY id
                """,
                (activo,),
            )
        return [dict(r) for r in cur.fetchall()]


def get_by_proceso(proceso_id: int, activo: bool | None = None) -> list[dict]:
    with db_cursor() as cur:
        if activo is None:
            cur.execute(
                "SELECT id, proceso_id, nombre, metrica, objetivo, version, activo FROM contrato WHERE proceso_id=%s ORDER BY id",
                (proceso_id,),
            )
        else:
            cur.execute(
                """
                SELECT id, proceso_id, nombre, metrica, objetivo, version, activo
                FROM contrato WHERE proceso_id=%s AND activo=%s ORDER BY id
                """,
                (proceso_id, activo),
            )
        return [dict(r) for r in cur.fetchall()]


def get_by_id(contrato_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, proceso_id, nombre, metrica, objetivo, version, activo FROM contrato WHERE id=%s",
            (contrato_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def update(contrato_id: int, nombre: str, metrica: str | None = None, objetivo: str | None = None) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre del contrato es obligatorio.")
    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE contrato
            SET nombre=%s, metrica=%s, objetivo=%s
            WHERE id=%s
            RETURNING id, proceso_id, nombre, metrica, objetivo, version, activo
            """,
            (nombre.strip(), metrica, objetivo, contrato_id),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Contrato no encontrado.")
        return dict(row)


def toggle_activo(contrato_id: int) -> dict:
    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE contrato
            SET activo = NOT activo
            WHERE id=%s
            RETURNING id, proceso_id, nombre, metrica, objetivo, version, activo
            """,
            (contrato_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Contrato no encontrado.")
        return dict(row)


def delete(contrato_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute("DELETE FROM contrato WHERE id=%s", (contrato_id,))
        return cur.rowcount > 0


def add_maquina(contrato_id: int, maquina_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO contrato_maquina(contrato_id, maquina_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            (contrato_id, maquina_id),
        )
        return True


def remove_maquina(contrato_id: int, maquina_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute("DELETE FROM contrato_maquina WHERE contrato_id=%s AND maquina_id=%s", (contrato_id, maquina_id))
        return cur.rowcount > 0


def get_maquinas(contrato_id: int) -> list[dict]:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT m.id, m.nombre
            FROM maquina m
            JOIN contrato_maquina cm ON cm.maquina_id = m.id
            WHERE cm.contrato_id=%s
            ORDER BY m.id
            """,
            (contrato_id,),
        )
        return [dict(r) for r in cur.fetchall()]
