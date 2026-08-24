from __future__ import annotations

import psycopg2.extras

from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import normalize_relationship_type
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


def _metadata_payload(metadata: dict | None) -> psycopg2.extras.Json:
    return psycopg2.extras.Json(metadata or {})


def create(
    parent_node_id: int,
    child_node_id: int,
    relationship_type: str,
    *,
    metadata: dict | None = None,
    is_primary: bool = False,
) -> dict:
    relation = normalize_relationship_type(relationship_type)
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO relationship(
                parent_node_id, child_node_id, relationship_type, metadata, is_primary
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (parent_node_id, child_node_id, relationship_type)
            DO UPDATE SET
                metadata = EXCLUDED.metadata,
                is_primary = relationship.is_primary OR EXCLUDED.is_primary,
                updated_at = NOW()
            RETURNING id, parent_node_id, child_node_id, relationship_type, metadata, is_primary
            """,
            (parent_node_id, child_node_id, relation, _metadata_payload(metadata), is_primary),
        )
        return dict(cur.fetchone())


def get_by_parent(parent_node_id: int, relationship_type: str | None = None) -> list[dict]:
    with db_cursor() as cur:
        if relationship_type:
            cur.execute(
                """
                SELECT id, parent_node_id, child_node_id, relationship_type, metadata, is_primary
                FROM relationship
                WHERE parent_node_id=%s AND relationship_type=%s
                ORDER BY child_node_id, id
                """,
                (parent_node_id, normalize_relationship_type(relationship_type)),
            )
        else:
            cur.execute(
                """
                SELECT id, parent_node_id, child_node_id, relationship_type, metadata, is_primary
                FROM relationship
                WHERE parent_node_id=%s
                ORDER BY relationship_type, child_node_id, id
                """,
                (parent_node_id,),
            )
        return [dict(row) for row in cur.fetchall()]


def get_by_child(child_node_id: int, relationship_type: str | None = None) -> list[dict]:
    with db_cursor() as cur:
        if relationship_type:
            cur.execute(
                """
                SELECT id, parent_node_id, child_node_id, relationship_type, metadata, is_primary
                FROM relationship
                WHERE child_node_id=%s AND relationship_type=%s
                ORDER BY parent_node_id, id
                """,
                (child_node_id, normalize_relationship_type(relationship_type)),
            )
        else:
            cur.execute(
                """
                SELECT id, parent_node_id, child_node_id, relationship_type, metadata, is_primary
                FROM relationship
                WHERE child_node_id=%s
                ORDER BY relationship_type, parent_node_id, id
                """,
                (child_node_id,),
            )
        return [dict(row) for row in cur.fetchall()]


def list_structural_edges() -> list[dict]:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT id, parent_node_id, child_node_id, relationship_type, metadata, is_primary
            FROM relationship
            WHERE relationship_type IN ('DEPENDS_ON', 'CAUSES')
            ORDER BY parent_node_id, child_node_id, id
            """
        )
        return [dict(row) for row in cur.fetchall()]


def delete(parent_node_id: int, child_node_id: int, relationship_type: str) -> bool:
    with db_cursor() as cur:
        cur.execute(
            """
            DELETE FROM relationship
            WHERE parent_node_id=%s AND child_node_id=%s AND relationship_type=%s
            """,
            (parent_node_id, child_node_id, normalize_relationship_type(relationship_type)),
        )
        return cur.rowcount > 0


def delete_legacy_structural_links(child_node_id: int) -> int:
    with db_cursor() as cur:
        cur.execute(
            """
            DELETE FROM relationship
            WHERE child_node_id=%s
              AND relationship_type IN ('DEPENDS_ON', 'CAUSES')
              AND COALESCE(metadata->>'source', '') = 'legacy'
            """,
            (child_node_id,),
        )
        return cur.rowcount
