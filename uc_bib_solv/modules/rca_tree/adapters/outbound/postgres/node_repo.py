from __future__ import annotations

import uuid

import psycopg2.extras

from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import normalize_node_type
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


def _node_code(node_type: str, code: str | None = None) -> str:
    normalized = normalize_node_type(node_type)
    if code and code.strip():
        return code.strip().upper()
    return f"{normalized}:{uuid.uuid4().hex[:12].upper()}"


def _metadata_payload(metadata: dict | None) -> psycopg2.extras.Json:
    return psycopg2.extras.Json(metadata or {})


def create(
    node_type: str,
    name: str,
    *,
    code: str | None = None,
    description: str | None = None,
    status: str | None = None,
    legacy_table: str | None = None,
    legacy_id: int | None = None,
    metadata: dict | None = None,
) -> dict:
    normalized_type = normalize_node_type(node_type)
    if not name or not name.strip():
        raise ValueError("El nombre del nodo es obligatorio.")

    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO node(
                node_type, code, name, description, status, legacy_table, legacy_id, metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, node_type, code, name, description, status, legacy_table, legacy_id, metadata
            """,
            (
                normalized_type,
                _node_code(normalized_type, code=code),
                name.strip(),
                description,
                status,
                legacy_table,
                legacy_id,
                _metadata_payload(metadata),
            ),
        )
        return dict(cur.fetchone())


def upsert_legacy_node(
    node_type: str,
    legacy_table: str,
    legacy_id: int,
    name: str,
    *,
    code: str | None = None,
    description: str | None = None,
    status: str | None = None,
    metadata: dict | None = None,
) -> dict:
    normalized_type = normalize_node_type(node_type)
    if not name or not name.strip():
        raise ValueError("El nombre del nodo es obligatorio.")

    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO node(
                node_type, code, name, description, status, legacy_table, legacy_id, metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (legacy_table, legacy_id)
            DO UPDATE SET
                node_type = EXCLUDED.node_type,
                code = EXCLUDED.code,
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING id, node_type, code, name, description, status, legacy_table, legacy_id, metadata
            """,
            (
                normalized_type,
                _node_code(normalized_type, code=code or f"{normalized_type}:{legacy_id}"),
                name.strip(),
                description,
                status,
                legacy_table,
                int(legacy_id),
                _metadata_payload(metadata),
            ),
        )
        return dict(cur.fetchone())


def get_by_id(node_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, node_type, code, name, description, status, legacy_table, legacy_id, metadata
            FROM node
            WHERE id=%s
            """,
            (node_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_by_legacy_ref(legacy_table: str, legacy_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, node_type, code, name, description, status, legacy_table, legacy_id, metadata
            FROM node
            WHERE legacy_table=%s AND legacy_id=%s
            """,
            (legacy_table, legacy_id),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def update(
    node_id: int,
    *,
    name: str | None = None,
    description: str | None = None,
    status: str | None = None,
    metadata: dict | None = None,
) -> dict:
    current = get_by_id(int(node_id))
    if not current:
        raise ValueError("Nodo no encontrado.")
    next_name = (name if name is not None else current["name"]) or ""
    if not str(next_name).strip():
        raise ValueError("El nombre del nodo es obligatorio.")

    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE node
            SET
                name=%s,
                description=%s,
                status=%s,
                metadata=%s,
                updated_at=NOW()
            WHERE id=%s
            RETURNING id, node_type, code, name, description, status, legacy_table, legacy_id, metadata
            """,
            (
                str(next_name).strip(),
                description if description is not None else current["description"],
                status if status is not None else current["status"],
                _metadata_payload(metadata if metadata is not None else current.get("metadata") or {}),
                node_id,
            ),
        )
        return dict(cur.fetchone())


def search_candidates(node_type: str, text: str | None = None, *, limit: int = 25) -> list[dict]:
    normalized_type = normalize_node_type(node_type)
    with db_cursor() as cur:
        if text and text.strip():
            pattern = f"%{text.strip()}%"
            cur.execute(
                """
                SELECT id, node_type, code, name, description, status, legacy_table, legacy_id, metadata
                FROM node
                WHERE node_type=%s
                  AND (name ILIKE %s OR code ILIKE %s OR COALESCE(description, '') ILIKE %s)
                ORDER BY name, id
                LIMIT %s
                """,
                (normalized_type, pattern, pattern, pattern, limit),
            )
        else:
            cur.execute(
                """
                SELECT id, node_type, code, name, description, status, legacy_table, legacy_id, metadata
                FROM node
                WHERE node_type=%s
                ORDER BY name, id
                LIMIT %s
                """,
                (normalized_type, limit),
            )
        return [dict(row) for row in cur.fetchall()]


def delete(node_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute("DELETE FROM node WHERE id=%s", (node_id,))
        return cur.rowcount > 0
