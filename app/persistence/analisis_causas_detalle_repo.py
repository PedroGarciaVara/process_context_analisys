from __future__ import annotations

from app.persistence import graph_sync, node_repo
from app.persistence.db import db_cursor


def upsert(
    analisis_causa_id: int,
    tipo_elemento: str,
    evaluacion: str,
    comentario: str | None = None,
    causa_id: int | None = None,
    hipotesis_id: int | None = None,
) -> dict:
    node_id = None
    if tipo_elemento == "causa" and causa_id is not None:
        graph_sync.sync_causa_graph(int(causa_id))
        mapped = node_repo.get_by_legacy_ref("causa", int(causa_id))
        node_id = int(mapped["id"]) if mapped else None
    elif tipo_elemento == "hipotesis" and hipotesis_id is not None:
        graph_sync.sync_hypothesis_graph(int(hipotesis_id))
        mapped = node_repo.get_by_legacy_ref("hipotesis", int(hipotesis_id))
        node_id = int(mapped["id"]) if mapped else None

    with db_cursor() as cur:
        if tipo_elemento == "causa" and causa_id is not None:
            cur.execute(
                """
                SELECT id
                FROM analisis_causas_detalle
                WHERE analisis_causa_id=%s AND tipo_elemento='causa' AND causa_id=%s
                """,
                (analisis_causa_id, causa_id),
            )
            existing = cur.fetchone()
        elif tipo_elemento == "hipotesis" and hipotesis_id is not None:
            cur.execute(
                """
                SELECT id
                FROM analisis_causas_detalle
                WHERE analisis_causa_id=%s AND tipo_elemento='hipotesis' AND hipotesis_id=%s
                """,
                (analisis_causa_id, hipotesis_id),
            )
            existing = cur.fetchone()
        else:
            existing = None

        if existing:
            cur.execute(
                """
                UPDATE analisis_causas_detalle
                SET evaluacion=%s, comentario=%s, fecha=NOW(), node_id=%s
                WHERE id=%s
                RETURNING id, analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha
                """,
                (evaluacion, comentario, node_id, existing["id"]),
            )
            return dict(cur.fetchone())

        cur.execute(
            """
            INSERT INTO analisis_causas_detalle(
                analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id, analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha
            """,
            (analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario),
        )
        return dict(cur.fetchone())


def get_by_analisis(analisis_causa_id: int) -> list[dict]:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha
            FROM analisis_causas_detalle
            WHERE analisis_causa_id=%s
            ORDER BY fecha DESC, id DESC
            """,
            (analisis_causa_id,),
        )
        return [dict(r) for r in cur.fetchall()]


def get_for_causa(analisis_causa_id: int, causa_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha
            FROM analisis_causas_detalle
            WHERE analisis_causa_id=%s AND tipo_elemento='causa' AND causa_id=%s
            """,
            (analisis_causa_id, causa_id),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_for_hipotesis(analisis_causa_id: int, hipotesis_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha
            FROM analisis_causas_detalle
            WHERE analisis_causa_id=%s AND tipo_elemento='hipotesis' AND hipotesis_id=%s
            """,
            (analisis_causa_id, hipotesis_id),
        )
        row = cur.fetchone()
        return dict(row) if row else None
