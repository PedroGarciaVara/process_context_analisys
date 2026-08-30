from __future__ import annotations

from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import node_repo, relationship_repo
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


def _sync_process_node(proceso_id: int | None) -> dict | None:
    if proceso_id is None:
        return None
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre, node_id FROM proceso WHERE id=%s", (proceso_id,))
        row = cur.fetchone()
    if not row:
        return None
    if row.get("node_id") is not None:
        return node_repo.get_by_id(int(row["node_id"]))
    node = node_repo.create("PROCESS", row["nombre"])
    with db_cursor() as cur:
        cur.execute("UPDATE proceso SET node_id=%s WHERE id=%s", (int(node["id"]), int(row["id"])))
    return node


def _sync_machine_node(maquina_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre, node_id, activo FROM maquina WHERE id=%s", (maquina_id,))
        row = cur.fetchone()
    if not row:
        return None
    if row.get("node_id") is not None:
        return node_repo.get_by_id(int(row["node_id"]))
    node = node_repo.create("MACHINE", row["nombre"], status="active" if row.get("activo") else "inactive")
    with db_cursor() as cur:
        cur.execute("UPDATE maquina SET node_id=%s WHERE id=%s", (int(node["id"]), int(row["id"])))
    return node


def sync_contract_graph(contrato_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, proceso_id, node_id, nombre, kpi_description, kpi_args, kpi_function, objetivo, version, activo
            FROM contrato
            WHERE id=%s
            """,
            (contrato_id,),
        )
        contract = cur.fetchone()
        if not contract:
            return None
        cur.execute(
            """
            SELECT maquina_id
            FROM contrato_maquina
            WHERE contrato_id=%s
            ORDER BY maquina_id
            """,
            (contrato_id,),
        )
        machines = [int(row["maquina_id"]) for row in cur.fetchall()]
        cur.execute("SELECT id FROM causa WHERE contrato_id=%s ORDER BY id", (contrato_id,))
        cause_ids = [int(row["id"]) for row in cur.fetchall()]

    process_node = _sync_process_node(contract["proceso_id"])
    contract_node = node_repo.get_by_id(int(contract["node_id"])) if contract.get("node_id") is not None else None
    if contract_node is None:
        contract_node = node_repo.create(
            "CONTRACT",
            contract["nombre"],
            description=contract.get("objetivo"),
            status="active" if contract.get("activo") else "inactive",
            metadata={"kpi_description": contract.get("kpi_description"), "kpi_args": contract.get("kpi_args", ""), "kpi_function": contract.get("kpi_function", ""), "objetivo": contract.get("objetivo"), "version": contract.get("version")},
        )
        with db_cursor() as cur:
            cur.execute("UPDATE contrato SET node_id=%s WHERE id=%s", (int(contract_node["id"]), int(contract["id"])))

    if process_node:
        relationship_repo.create(
            int(contract_node["id"]),
            int(process_node["id"]),
            "BELONGS_TO",
            metadata={"source": "graph_sync"},
            is_primary=True,
        )

    for machine_id in machines:
        machine_node = _sync_machine_node(machine_id)
        if machine_node:
            relationship_repo.create(
                int(contract_node["id"]),
                int(machine_node["id"]),
                "BELONGS_TO",
                metadata={"source": "graph_sync"},
                is_primary=False,
            )

    for cause_id in cause_ids:
        sync_causa_graph(cause_id)

    return contract_node


def sync_causa_graph(causa_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, node_id, contrato_id, parent_id, nombre, descripcion, tipo, categoria
            FROM causa
            WHERE id=%s
            """,
            (causa_id,),
        )
        cause = cur.fetchone()
    if not cause:
        return None

    contract_node = None
    if cause.get("contrato_id") is not None:
        with db_cursor() as cur:
            cur.execute("SELECT node_id FROM contrato WHERE id=%s", (int(cause["contrato_id"]),))
            contract = cur.fetchone()
        contract_node = node_repo.get_by_id(int(contract["node_id"])) if contract and contract.get("node_id") else None
        contract_node = contract_node or sync_contract_graph(int(cause["contrato_id"]))
    cause_node = None
    if cause.get("node_id") is not None:
        cause_node = node_repo.get_by_id(int(cause["node_id"]))
    if cause_node is None:
        cause_node = node_repo.create(
            "CAUSE", cause["nombre"],
            description=cause.get("descripcion"),
            metadata={
                "source": "graph_sync",
                "categoria": cause.get("categoria"),
                "contract_id": int(cause["contrato_id"]) if cause.get("contrato_id") is not None else None,
            },
        )
        with db_cursor() as cur:
            cur.execute("UPDATE causa SET node_id=%s WHERE id=%s", (int(cause_node["id"]), int(cause["id"])))
    relationship_repo.delete_structural_links(int(cause_node["id"]))

    if cause.get("parent_id") is not None:
        with db_cursor() as cur:
            cur.execute("SELECT node_id FROM causa WHERE id=%s", (int(cause["parent_id"]),))
            parent = cur.fetchone()
        parent_node = node_repo.get_by_id(int(parent["node_id"])) if parent and parent.get("node_id") else None
        parent_node = parent_node or sync_causa_graph(int(cause["parent_id"]))
        relationship_repo.create(
            int(parent_node["id"]),
            int(cause_node["id"]),
            "CAUSES",
            metadata={"source": "graph_sync"},
            is_primary=True,
        )
    elif contract_node is not None:
        relationship_repo.create(
            int(contract_node["id"]),
            int(cause_node["id"]),
            "CAUSES",
            metadata={"source": "graph_sync"},
            is_primary=True,
        )

    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id
            FROM hipotesis
            WHERE causa_id=%s
               OR node_id IN (
                    SELECT rel.child_node_id
                    FROM relationship rel
                    WHERE rel.parent_node_id=%s
                      AND rel.relationship_type='HAS_HYPOTHESIS'
               )
            ORDER BY id
            """,
            (causa_id, int(cause_node["id"])),
        )
        hypothesis_ids = [int(row["id"]) for row in cur.fetchall()]
    for hypothesis_id in hypothesis_ids:
        sync_hypothesis_graph(hypothesis_id)

    return cause_node


def sync_hypothesis_graph(hipotesis_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, node_id, causa_id, nombre, descripcion, tipo, criterio_validacion, estado
            FROM hipotesis
            WHERE id=%s
            """,
            (hipotesis_id,),
        )
        hypothesis = cur.fetchone()
    if not hypothesis:
        return None

    cause_node = None
    if hypothesis.get("causa_id") is not None:
        with db_cursor() as cur:
            cur.execute("SELECT node_id FROM causa WHERE id=%s", (int(hypothesis["causa_id"]),))
            cause = cur.fetchone()
        cause_node = node_repo.get_by_id(int(cause["node_id"])) if cause and cause.get("node_id") else None
        cause_node = cause_node or sync_causa_graph(int(hypothesis["causa_id"]))
    hypothesis_node = None
    if hypothesis.get("node_id") is not None:
        hypothesis_node = node_repo.get_by_id(int(hypothesis["node_id"]))
    if hypothesis_node is None:
        hypothesis_node = node_repo.create(
            "HYPOTHESIS", hypothesis["nombre"],
            description=hypothesis.get("criterio_validacion"),
            status=hypothesis.get("estado"),
            metadata={"source": "graph_sync"},
        )
        with db_cursor() as cur:
            cur.execute("UPDATE hipotesis SET node_id=%s WHERE id=%s", (int(hypothesis_node["id"]), int(hypothesis["id"])))

    with db_cursor() as cur:
        cur.execute(
            """
            DELETE FROM relationship
            WHERE child_node_id=%s
              AND relationship_type='HAS_HYPOTHESIS'
            """,
            (int(hypothesis_node["id"]),),
        )

    if cause_node is not None:
        relationship_repo.create(
            int(cause_node["id"]),
            int(hypothesis_node["id"]),
            "HAS_HYPOTHESIS",
            metadata={"source": "graph_sync"},
            is_primary=True,
        )
    return hypothesis_node
