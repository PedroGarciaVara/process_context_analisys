from __future__ import annotations

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


def create(
    proceso_id: int,
    nombre: str,
    metrica: str | None = None,
    objetivo: str | None = None,
    bpm_process_id: str | None = None,
    bpm_node_id: str | None = None,
) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre del contrato es obligatorio.")
    with db_cursor() as cur:
        if bpm_process_id is None and bpm_node_id is None:
            cur.execute("SELECT bpm_process_id FROM proceso WHERE id=%s", (proceso_id,))
            scope = cur.fetchone()
            if not scope or not scope["bpm_process_id"]:
                raise ValueError("El proceso no tiene una relación BPM válida.")
            bpm_process_id = str(scope["bpm_process_id"])
        cur.execute(
            """
            INSERT INTO contrato(proceso_id, bpm_process_id, bpm_node_id, nombre, metrica, objetivo)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, proceso_id, bpm_process_id, bpm_node_id, nombre, metrica, objetivo, version, activo
            """,
            (proceso_id, bpm_process_id, bpm_node_id, nombre.strip(), metrica, objetivo),
        )
        return dict(cur.fetchone())


def get_all(activo: bool | None = None) -> list[dict]:
    with db_cursor() as cur:
        if activo is None:
            cur.execute(
                "SELECT id, proceso_id, bpm_process_id, bpm_node_id, nombre, metrica, objetivo, version, activo FROM contrato ORDER BY id"
            )
        else:
            cur.execute(
                """
                SELECT id, proceso_id, bpm_process_id, bpm_node_id, nombre, metrica, objetivo, version, activo
                FROM contrato WHERE activo=%s ORDER BY id
                """,
                (activo,),
            )
        return [dict(r) for r in cur.fetchall()]


def get_by_proceso(proceso_id: int, activo: bool | None = None) -> list[dict]:
    with db_cursor() as cur:
        if activo is None:
            cur.execute(
                "SELECT id, proceso_id, bpm_process_id, bpm_node_id, nombre, metrica, objetivo, version, activo FROM contrato WHERE proceso_id=%s ORDER BY id",
                (proceso_id,),
            )
        else:
            cur.execute(
                """
                SELECT id, proceso_id, bpm_process_id, bpm_node_id, nombre, metrica, objetivo, version, activo
                FROM contrato WHERE proceso_id=%s AND activo=%s ORDER BY id
                """,
                (proceso_id, activo),
            )
        return [dict(r) for r in cur.fetchall()]


def get_by_id(contrato_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, proceso_id, bpm_process_id, bpm_node_id, nombre, metrica, objetivo, version, activo FROM contrato WHERE id=%s",
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
            RETURNING id, proceso_id, bpm_process_id, bpm_node_id, nombre, metrica, objetivo, version, activo
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
            RETURNING id, proceso_id, bpm_process_id, bpm_node_id, nombre, metrica, objetivo, version, activo
            """,
            (contrato_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Contrato no encontrado.")
        return dict(row)


def delete(contrato_id: int) -> bool:
    with db_cursor() as cur:
        # causa.parent_id is RESTRICT so nested causes cannot be removed by
        # contrato's ON DELETE CASCADE while they still reference a sibling
        # cause in the same contract. Detach the hierarchy first; the
        # contract cascade then removes the causes and their descendants.
        cur.execute(
            "UPDATE causa SET parent_id=NULL WHERE contrato_id=%s",
            (contrato_id,),
        )
        # analisis_resultado.causa_id uses RESTRICT because reusable causes
        # must not be removed while an analysis result still points at them.
        # A contract deletion cascades its analyses/causes, so remove those
        # analysis-local results first in the same transaction.
        cur.execute(
            """
            DELETE FROM analisis_resultado ar
            USING analisis_causas ac
            WHERE ar.analisis_id = ac.id
              AND ac.contrato_id = %s
            """,
            (contrato_id,),
        )
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
