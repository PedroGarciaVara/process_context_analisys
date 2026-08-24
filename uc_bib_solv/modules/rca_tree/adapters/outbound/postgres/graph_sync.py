from __future__ import annotations

from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import node_repo, relationship_repo
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


def _sync_process_node(proceso_id: int | None) -> dict | None:
    if proceso_id is None:
        return None
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre FROM proceso WHERE id=%s", (proceso_id,))
        row = cur.fetchone()
    if not row:
        return None
    return node_repo.upsert_legacy_node(
        "PROCESS",
        "proceso",
        int(row["id"]),
        row["nombre"],
        metadata={"source": "legacy"},
    )


def _sync_machine_node(maquina_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute("SELECT id, nombre FROM maquina WHERE id=%s", (maquina_id,))
        row = cur.fetchone()
    if not row:
        return None
    return node_repo.upsert_legacy_node(
        "MACHINE",
        "maquina",
        int(row["id"]),
        row["nombre"],
        metadata={"source": "legacy"},
    )


def sync_contract_graph(contrato_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, proceso_id, nombre, metrica, objetivo, version, activo
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
        cur.execute(
            """
            SELECT id
            FROM causa
            WHERE contrato_id=%s
               OR id IN (
                    SELECT legacy_child.legacy_id
                    FROM relationship rel
                    JOIN node legacy_parent ON legacy_parent.id = rel.parent_node_id
                    JOIN node legacy_child ON legacy_child.id = rel.child_node_id
                    WHERE legacy_parent.legacy_table='contrato'
                      AND legacy_parent.legacy_id=%s
                      AND legacy_child.legacy_table='causa'
                      AND rel.relationship_type IN ('DEPENDS_ON', 'CAUSES')
               )
            ORDER BY id
            """,
            (contrato_id, contrato_id),
        )
        cause_ids = [int(row["id"]) for row in cur.fetchall()]

    process_node = _sync_process_node(contract["proceso_id"])
    contract_node = node_repo.upsert_legacy_node(
        "CONTRACT",
        "contrato",
        int(contract["id"]),
        contract["nombre"],
        description=contract.get("objetivo"),
        status="active" if contract.get("activo") else "inactive",
        metadata={
            "source": "legacy",
            "metrica": contract.get("metrica"),
            "objetivo": contract.get("objetivo"),
            "version": contract.get("version"),
        },
    )

    if process_node:
        relationship_repo.create(
            int(contract_node["id"]),
            int(process_node["id"]),
            "BELONGS_TO",
            metadata={"source": "legacy"},
            is_primary=True,
        )

    for machine_id in machines:
        machine_node = _sync_machine_node(machine_id)
        if machine_node:
            relationship_repo.create(
                int(contract_node["id"]),
                int(machine_node["id"]),
                "BELONGS_TO",
                metadata={"source": "legacy"},
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
        contract_node = node_repo.get_by_legacy_ref("contrato", int(cause["contrato_id"])) or sync_contract_graph(int(cause["contrato_id"]))
    cause_node = None
    if cause.get("node_id") is not None:
        cause_node = node_repo.get_by_id(int(cause["node_id"]))
    if cause_node is None:
        cause_node = node_repo.upsert_legacy_node(
            "CAUSE",
            "causa",
            int(cause["id"]),
            cause["nombre"],
            description=cause.get("descripcion"),
            metadata={
                "source": "legacy",
                "categoria": cause.get("categoria"),
                "legacy_tipo": cause.get("tipo") or "causa",
                "contract_id": int(cause["contrato_id"]) if cause.get("contrato_id") is not None else None,
            },
        )
        with db_cursor() as cur:
            cur.execute("UPDATE causa SET node_id=%s WHERE id=%s", (int(cause_node["id"]), int(cause["id"])))
    relationship_repo.delete_legacy_structural_links(int(cause_node["id"]))

    if cause.get("parent_id") is not None:
        parent_node = node_repo.get_by_legacy_ref("causa", int(cause["parent_id"])) or sync_causa_graph(int(cause["parent_id"]))
        relationship_repo.create(
            int(parent_node["id"]),
            int(cause_node["id"]),
            "CAUSES",
            metadata={"source": "legacy"},
            is_primary=True,
        )
    elif contract_node is not None:
        relationship_repo.create(
            int(contract_node["id"]),
            int(cause_node["id"]),
            "DEPENDS_ON",
            metadata={"source": "legacy"},
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
                      AND rel.relationship_type='VERIFIED_BY'
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
            SELECT id, node_id, causa_id, descripcion, tipo, criterio_validacion, estado
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
        cause_node = node_repo.get_by_legacy_ref("causa", int(hypothesis["causa_id"])) or sync_causa_graph(int(hypothesis["causa_id"]))
    hypothesis_node = None
    if hypothesis.get("node_id") is not None:
        hypothesis_node = node_repo.get_by_id(int(hypothesis["node_id"]))
    if hypothesis_node is None:
        hypothesis_node = node_repo.upsert_legacy_node(
            "HYPOTHESIS",
            "hipotesis",
            int(hypothesis["id"]),
            hypothesis["descripcion"],
            description=hypothesis.get("criterio_validacion"),
            status=hypothesis.get("estado"),
            metadata={
                "source": "legacy",
                "legacy_tipo": hypothesis.get("tipo") or "aceptacion",
                "cause_id": int(hypothesis["causa_id"]) if hypothesis.get("causa_id") is not None else None,
            },
        )
        with db_cursor() as cur:
            cur.execute("UPDATE hipotesis SET node_id=%s WHERE id=%s", (int(hypothesis_node["id"]), int(hypothesis["id"])))

    with db_cursor() as cur:
        cur.execute(
            """
            DELETE FROM relationship
            WHERE child_node_id=%s
              AND relationship_type='VERIFIED_BY'
              AND COALESCE(metadata->>'source', '')='legacy'
            """,
            (int(hypothesis_node["id"]),),
        )

    if cause_node is not None:
        relationship_repo.create(
            int(cause_node["id"]),
            int(hypothesis_node["id"]),
            "VERIFIED_BY",
            metadata={"source": "legacy"},
            is_primary=True,
        )
    return hypothesis_node


def sync_existing_legacy_graph() -> None:
    with db_cursor() as cur:
        cur.execute("SELECT id FROM proceso ORDER BY id")
        process_ids = [int(row["id"]) for row in cur.fetchall()]
        cur.execute("SELECT id FROM maquina ORDER BY id")
        machine_ids = [int(row["id"]) for row in cur.fetchall()]
        cur.execute("SELECT id FROM contrato ORDER BY id")
        contract_ids = [int(row["id"]) for row in cur.fetchall()]
        cur.execute("SELECT id FROM causa ORDER BY id")
        cause_ids = [int(row["id"]) for row in cur.fetchall()]
        cur.execute("SELECT id FROM hipotesis ORDER BY id")
        hypothesis_ids = [int(row["id"]) for row in cur.fetchall()]

    for process_id in process_ids:
        _sync_process_node(process_id)
    for machine_id in machine_ids:
        _sync_machine_node(machine_id)
    for contract_id in contract_ids:
        sync_contract_graph(contract_id)
    for cause_id in cause_ids:
        sync_causa_graph(cause_id)
    for hypothesis_id in hypothesis_ids:
        sync_hypothesis_graph(hypothesis_id)

    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE analisis_causas_detalle acd
            SET node_id = n.id
            FROM node n
            WHERE acd.node_id IS NULL
              AND (
                    (acd.tipo_elemento='causa' AND n.legacy_table='causa' AND n.legacy_id=acd.causa_id)
                 OR (acd.tipo_elemento='hipotesis' AND n.legacy_table='hipotesis' AND n.legacy_id=acd.hipotesis_id)
              )
            """
        )
