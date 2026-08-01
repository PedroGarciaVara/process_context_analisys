from __future__ import annotations

from app.persistence.db import db_cursor


def create(
    contrato_id: int,
    proceso_id: int | None,
    maquina_id: int | None,
    persona_inicializacion: str,
    descripcion_apertura: str,
) -> dict:
    if not persona_inicializacion or not persona_inicializacion.strip():
        raise ValueError("La persona de inicialización es obligatoria.")
    if not descripcion_apertura or not descripcion_apertura.strip():
        raise ValueError("La descripción de apertura es obligatoria.")
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO analisis_causas(
                contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura, estado, fecha_inicializacion, fecha_reapertura, fecha_cierre
            """,
            (contrato_id, proceso_id, maquina_id, persona_inicializacion.strip(), descripcion_apertura.strip()),
        )
        return dict(cur.fetchone())


def get_by_id(analisis_causa_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura,
                   estado, fecha_inicializacion, fecha_reapertura, fecha_cierre
            FROM analisis_causas
            WHERE id=%s
            """,
            (analisis_causa_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_by_contrato(contrato_id: int, estado: str | None = None) -> list[dict]:
    with db_cursor() as cur:
        if estado:
            cur.execute(
                """
                SELECT id, contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura,
                       estado, fecha_inicializacion, fecha_reapertura, fecha_cierre
                FROM analisis_causas
                WHERE contrato_id=%s AND estado=%s
                ORDER BY fecha_inicializacion DESC, id DESC
                """,
                (contrato_id, estado),
            )
        else:
            cur.execute(
                """
                SELECT id, contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura,
                       estado, fecha_inicializacion, fecha_reapertura, fecha_cierre
                FROM analisis_causas
                WHERE contrato_id=%s
                ORDER BY fecha_inicializacion DESC, id DESC
                """,
                (contrato_id,),
            )
        return [dict(r) for r in cur.fetchall()]


def get_open_by_contrato(contrato_id: int) -> dict | None:
    items = get_by_contrato(contrato_id, estado="abierto")
    return items[0] if items else None


def update_estado(analisis_causa_id: int, estado: str) -> dict:
    with db_cursor() as cur:
        if estado == "cerrado":
            cur.execute(
                """
                UPDATE analisis_causas
                SET estado=%s, fecha_cierre=NOW()
                WHERE id=%s
                RETURNING id, contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura,
                          estado, fecha_inicializacion, fecha_reapertura, fecha_cierre
                """,
                (estado, analisis_causa_id),
            )
        else:
            cur.execute(
                """
                UPDATE analisis_causas
                SET estado=%s, fecha_reapertura=NOW(), fecha_cierre=NULL
                WHERE id=%s
                RETURNING id, contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura,
                          estado, fecha_inicializacion, fecha_reapertura, fecha_cierre
                """,
                (estado, analisis_causa_id),
            )
        row = cur.fetchone()
        if not row:
            raise ValueError("Análisis no encontrado.")
        return dict(row)


def list_summary() -> list[dict]:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT ac.id,
                   ac.contrato_id,
                   ac.proceso_id,
                   ac.maquina_id,
                   ac.estado,
                   ac.fecha_inicializacion,
                   ac.fecha_cierre,
                   p.nombre AS proceso_nombre,
                   c.nombre AS contrato_nombre,
                   m.nombre AS maquina_nombre
            FROM analisis_causas ac
            LEFT JOIN proceso p ON p.id = ac.proceso_id
            LEFT JOIN contrato c ON c.id = ac.contrato_id
            LEFT JOIN maquina m ON m.id = ac.maquina_id
            ORDER BY ac.fecha_inicializacion DESC, ac.id DESC
            """
        )
        return [dict(r) for r in cur.fetchall()]
