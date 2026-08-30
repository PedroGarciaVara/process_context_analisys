from __future__ import annotations

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor
from psycopg2.extras import Json
import uuid


CONTRACT_COLUMNS = "id, proceso_id, bpm_process_id, bpm_node_id, node_id, nombre, kpi_description, kpi_args, kpi_function, objetivo, version, activo"


def _insert_node(cur, node_type, name, description=None, metadata=None):
    cur.execute("""INSERT INTO node(node_type, code, name, description, metadata)
        VALUES (%s,%s,%s,%s,%s) RETURNING id, node_type, name, description""",
        (node_type, f"{node_type}:TEMPLATE:{uuid.uuid4().hex}", name, description, Json(metadata or {})))
    return dict(cur.fetchone())


def _ensure_template(cur, contract):
    """Create/reuse the single CONTRACT -> CAUSE -> HYPOTHESIS template."""
    contract_id = int(contract["id"])
    contract_node = None
    if contract.get("node_id"):
        cur.execute("SELECT id, node_type FROM node WHERE id=%s FOR UPDATE", (contract["node_id"],))
        contract_node = cur.fetchone()
    if not contract_node:
        contract_node = _insert_node(cur, "CONTRACT", contract["nombre"], contract.get("objetivo"), {"template_role": "contract", "contract_id": contract_id})
        cur.execute("UPDATE contrato SET node_id=%s WHERE id=%s", (contract_node["id"], contract_id))

    cur.execute("""SELECT * FROM causa WHERE contrato_id=%s AND is_initial_template
        ORDER BY id LIMIT 1 FOR UPDATE""", (contract_id,))
    cause = cur.fetchone()
    if not cause:
        cause_node = _insert_node(cur, "CAUSE", contract["nombre"], contract.get("objetivo"), {"template_role": "initial_cause", "contract_id": contract_id})
        cur.execute("""INSERT INTO causa(node_id, contrato_id, nombre, descripcion, is_initial_template)
            VALUES (%s,%s,%s,%s,TRUE) RETURNING *""", (cause_node["id"], contract_id, contract["nombre"], contract.get("objetivo")))
        cause = cur.fetchone()
    else:
        cur.execute("SELECT id, node_type FROM node WHERE id=%s", (cause["node_id"],))
        cause_node = cur.fetchone()
        cur.execute("UPDATE causa SET nombre=%s, descripcion=%s, updated_at=NOW() WHERE id=%s",
                    (contract["nombre"], contract.get("objetivo"), cause["id"]))
        cur.execute("UPDATE node SET name=%s, description=%s, updated_at=NOW() WHERE id=%s",
                    (contract["nombre"], contract.get("objetivo"), cause_node["id"]))

    cur.execute("""SELECT * FROM hipotesis WHERE causa_id=%s AND is_initial_template
        ORDER BY id LIMIT 1 FOR UPDATE""", (cause["id"],))
    hypothesis = cur.fetchone()
    if not hypothesis:
        hypothesis_node = _insert_node(cur, "HYPOTHESIS", contract["kpi_description"], contract.get("kpi_description"), {"template_role": "initial_hypothesis", "contract_id": contract_id})
        cur.execute("""INSERT INTO hipotesis(node_id, causa_id, nombre, descripcion, kpi_args, kpi_function, is_initial_template)
            VALUES (%s,%s,%s,%s,%s,%s,TRUE) RETURNING *""", (hypothesis_node["id"], cause["id"], contract["kpi_description"], contract["kpi_description"], contract.get("kpi_args", ""), contract.get("kpi_function", "")))
        hypothesis = cur.fetchone()
    else:
        cur.execute("SELECT id, node_type FROM node WHERE id=%s", (hypothesis["node_id"],))
        hypothesis_node = cur.fetchone()
        cur.execute("""UPDATE hipotesis
                       SET nombre=%s, descripcion=%s, kpi_args=%s, kpi_function=%s, updated_at=NOW()
                       WHERE id=%s""",
                    (contract["kpi_description"], contract["kpi_description"],
                     contract.get("kpi_args", ""), contract.get("kpi_function", ""), hypothesis["id"]))
        cur.execute("UPDATE node SET name=%s, description=%s, updated_at=NOW() WHERE id=%s",
                    (contract["kpi_description"], contract["kpi_description"], hypothesis_node["id"]))

    for parent, child, relation in ((contract_node["id"], cause_node["id"], "CAUSES"), (cause_node["id"], hypothesis_node["id"], "HAS_HYPOTHESIS")):
        cur.execute("""INSERT INTO relationship(parent_node_id, child_node_id, relationship_type, metadata, is_primary)
            VALUES (%s,%s,%s,%s,TRUE) ON CONFLICT (parent_node_id, child_node_id, relationship_type)
            DO UPDATE SET is_primary=TRUE, metadata=EXCLUDED.metadata, updated_at=NOW()""",
            (parent, child, relation, Json({"template": True, "contract_id": contract_id})))
    return cause, hypothesis


def create(
    proceso_id: int,
    nombre: str,
    kpi_description: str,
    objetivo: str | None = None,
    bpm_process_id: str | None = None,
    bpm_node_id: str | None = None,
    kpi_args: str = "",
    kpi_function: str = "",
) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre del contrato es obligatorio.")
    if not isinstance(kpi_description, str) or kpi_description == "":
        raise ValueError("kpi_description es obligatorio.")
    if bool(bpm_process_id) == bool(bpm_node_id):
        raise ValueError("El contrato requiere un proceso BPM o una operación BPM, pero no ambos.")
    with db_cursor() as cur:
        if bpm_process_id is None and bpm_node_id is None:
            cur.execute("SELECT bpm_process_id FROM proceso WHERE id=%s", (proceso_id,))
            scope = cur.fetchone()
            if not scope or not scope["bpm_process_id"]:
                raise ValueError("El proceso no tiene una relación BPM válida.")
            bpm_process_id = str(scope["bpm_process_id"])
        cur.execute(
            """
            INSERT INTO contrato(proceso_id, bpm_process_id, bpm_node_id, nombre, kpi_description, kpi_args, kpi_function, objetivo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, proceso_id, bpm_process_id, bpm_node_id, node_id, nombre, kpi_description, kpi_args, kpi_function, objetivo, version, activo
            """,
            (proceso_id, bpm_process_id, bpm_node_id, nombre.strip(), kpi_description, kpi_args, kpi_function, objetivo),
        )
        contract = dict(cur.fetchone())
        _ensure_template(cur, contract)
        cur.execute(f"SELECT {CONTRACT_COLUMNS} FROM contrato WHERE id=%s", (contract["id"],))
        return dict(cur.fetchone())


def get_all(activo: bool | None = None) -> list[dict]:
    with db_cursor() as cur:
        if activo is None:
            cur.execute(
                f"SELECT {CONTRACT_COLUMNS} FROM contrato ORDER BY id"
            )
        else:
            cur.execute(
                f"""SELECT {CONTRACT_COLUMNS}
                FROM contrato WHERE activo=%s ORDER BY id""",
                (activo,),
            )
        return [dict(r) for r in cur.fetchall()]


def get_by_proceso(proceso_id: int, activo: bool | None = None) -> list[dict]:
    with db_cursor() as cur:
        if activo is None:
            cur.execute(
                f"SELECT {CONTRACT_COLUMNS} FROM contrato WHERE proceso_id=%s ORDER BY id",
                (proceso_id,),
            )
        else:
            cur.execute(
                f"""SELECT {CONTRACT_COLUMNS}
                FROM contrato WHERE proceso_id=%s AND activo=%s""",
                (proceso_id, activo),
            )
        return [dict(r) for r in cur.fetchall()]


def get_by_id(contrato_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            f"SELECT {CONTRACT_COLUMNS} FROM contrato WHERE id=%s",
            (contrato_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def update(contrato_id: int, nombre: str, kpi_description: str, objetivo: str | None = None, bpm_process_id=None, bpm_node_id=None, kpi_args: str = "", kpi_function: str = "") -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre del contrato es obligatorio.")
    if not isinstance(kpi_description, str) or kpi_description == "":
        raise ValueError("kpi_description es obligatorio.")
    if bool(bpm_process_id) == bool(bpm_node_id):
        raise ValueError("El contrato requiere un proceso BPM o una operación BPM, pero no ambos.")
    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE contrato
            SET nombre=%s, kpi_description=%s, kpi_args=%s, kpi_function=%s, objetivo=%s, bpm_process_id=%s, bpm_node_id=%s
            WHERE id=%s
            RETURNING id, proceso_id, bpm_process_id, bpm_node_id, node_id, nombre, kpi_description, kpi_args, kpi_function, objetivo, version, activo
            """,
            (nombre.strip(), kpi_description, kpi_args, kpi_function, objetivo, bpm_process_id, bpm_node_id, contrato_id),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Contrato no encontrado.")
        contract = dict(row)
        _ensure_template(cur, contract)
        cur.execute(f"SELECT {CONTRACT_COLUMNS} FROM contrato WHERE id=%s", (contrato_id,))
        return dict(cur.fetchone())


def toggle_activo(contrato_id: int) -> dict:
    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE contrato
            SET activo = NOT activo
            WHERE id=%s
            RETURNING id, proceso_id, bpm_process_id, bpm_node_id, node_id, nombre, kpi_description, kpi_args, kpi_function, objetivo, version, activo
            """,
            (contrato_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Contrato no encontrado.")
        return dict(row)


def delete(contrato_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute("""SELECT node_id FROM contrato WHERE id=%s FOR UPDATE""", (contrato_id,))
        contract = cur.fetchone()
        if not contract:
            return False
        cur.execute("""SELECT node_id FROM causa WHERE contrato_id=%s AND node_id IS NOT NULL FOR UPDATE""", (contrato_id,))
        cause_nodes = [int(row["node_id"]) for row in cur.fetchall()]
        cur.execute("""SELECT h.node_id FROM hipotesis h JOIN causa c ON c.id=h.causa_id
                       WHERE c.contrato_id=%s AND h.node_id IS NOT NULL FOR UPDATE""", (contrato_id,))
        hypothesis_nodes = [int(row["node_id"]) for row in cur.fetchall()]
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
        deleted = cur.rowcount > 0
        # Entity cascades do not delete the graph nodes because their FKs point
        # from entity to node.  Remove only nodes owned by this contract.
        node_ids = cause_nodes + hypothesis_nodes
        if contract.get("node_id") is not None:
            node_ids.append(int(contract["node_id"]))
        if node_ids:
            cur.execute("DELETE FROM node WHERE id = ANY(%s)", (node_ids,))
        return deleted


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
