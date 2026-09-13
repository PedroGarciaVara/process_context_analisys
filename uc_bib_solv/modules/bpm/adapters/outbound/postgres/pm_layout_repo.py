"""PostgreSQL repository for shared BPM node layout overrides."""

from __future__ import annotations

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor
from uc_bib_solv.modules.bpm.domain.processes.exceptions import ProcessModelingError
from uc_bib_solv.modules.bpm.domain.shared.value_objects import require_uuid as _require_uuid


def _uuid(value):
    return _require_uuid(value, "identifier")


def _record(row):
    return {
        "node_id": str(row["node_id"]),
        "x": float(row["x"]),
        "y": float(row["y"]),
    }


class ProcessLayoutRepository:
    def list_for_process(self, process_id):
        with db_cursor() as cur:
            cur.execute(
                """SELECT l.node_id,l.x,l.y
                     FROM pm_process_node_layout l
                     JOIN pm_process_node n ON n.node_id=l.node_id
                    WHERE n.process_id=%s
                    ORDER BY n.node_code,n.node_id""",
                (_uuid(process_id),),
            )
            return [_record(row) for row in cur.fetchall()]

    def replace_for_process(self, process_id, positions):
        process_uuid = _uuid(process_id)
        requested_ids = [str(item["node_id"]) for item in positions]
        with db_cursor() as cur:
            cur.execute(
                "SELECT node_id FROM pm_process_node WHERE process_id=%s FOR SHARE",
                (process_uuid,),
            )
            allowed = {str(row["node_id"]) for row in cur.fetchall()}
            if any(node_id not in allowed for node_id in requested_ids):
                raise ProcessModelingError(
                    "el layout contiene nodos que no pertenecen al proceso",
                    "layout_node_process_mismatch",
                )

            if requested_ids:
                cur.execute(
                    """DELETE FROM pm_process_node_layout l
                         USING pm_process_node n
                         WHERE l.node_id=n.node_id
                           AND n.process_id=%s
                           AND NOT (l.node_id = ANY(%s::uuid[]))""",
                    (process_uuid, requested_ids),
                )
            else:
                cur.execute(
                    """DELETE FROM pm_process_node_layout l
                         USING pm_process_node n
                         WHERE l.node_id=n.node_id AND n.process_id=%s""",
                    (process_uuid,),
                )

            for item in positions:
                cur.execute(
                    """INSERT INTO pm_process_node_layout(node_id,x,y)
                         VALUES(%s,%s,%s)
                         ON CONFLICT(node_id) DO UPDATE
                         SET x=EXCLUDED.x,y=EXCLUDED.y,updated_at=NOW()""",
                    (_uuid(item["node_id"]), item["x"], item["y"]),
                )

            cur.execute(
                """SELECT l.node_id,l.x,l.y
                     FROM pm_process_node_layout l
                     JOIN pm_process_node n ON n.node_id=l.node_id
                    WHERE n.process_id=%s
                    ORDER BY n.node_code,n.node_id""",
                (process_uuid,),
            )
            return [_record(row) for row in cur.fetchall()]


__all__ = ["ProcessLayoutRepository"]
