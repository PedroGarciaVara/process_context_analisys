"""Transaction primitives for atomic RCA persistence operations."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
import psycopg2.extras

from uc_bib_solv.modules.platform.infrastructure.postgres import get_connection


class RcaMoveError(ValueError):
    """Typed persistence error that can be translated by the HTTP adapter."""

    status = 409
    code = "RCA_MOVE_FAILED"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class RcaCauseNotFoundError(RcaMoveError):
    status, code = 404, "RCA_CAUSE_NOT_FOUND"


class RcaParentNotFoundError(RcaMoveError):
    status, code = 404, "RCA_PARENT_NOT_FOUND"


class RcaSelfParentError(RcaMoveError):
    code = "RCA_SELF_PARENT"


class RcaCycleDetectedError(RcaMoveError):
    code = "RCA_CYCLE_DETECTED"


class RcaContractMismatchError(RcaMoveError):
    code = "RCA_CONTRACT_MISMATCH"


class RcaRootPolicyError(RcaMoveError):
    code = "RCA_ROOT_POLICY"


class RcaVersionConflictError(RcaMoveError):
    code = "RCA_VERSION_CONFLICT"


class RcaPrimaryRelationConflictError(RcaMoveError):
    code = "RCA_PRIMARY_RELATION_CONFLICT"


class RcaInvalidReasonError(RcaMoveError):
    status, code = 422, "RCA_INVALID_REASON"


@contextmanager
def postgres_transaction() -> Iterator[Any]:
    """Yield one real PostgreSQL transaction and guarantee all-or-nothing work."""
    connection = get_connection()
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            try:
                yield cursor
            except Exception:
                connection.rollback()
                raise
            else:
                connection.commit()
    finally:
        connection.close()


def _cause_row(cursor: Any, cause_id: int, *, lock: bool = False) -> dict[str, Any] | None:
    suffix = " FOR UPDATE" if lock else ""
    cursor.execute(
        f"""
        SELECT id, node_id, contrato_id, parent_id, is_initial_template, version
        FROM causa WHERE id=%s{suffix}
        """,
        (int(cause_id),),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def _locked_contract_causes(cursor: Any, contract_id: int) -> list[dict[str, Any]]:
    # Serialising every cause in the contract makes the parent/descendant check
    # stable against concurrent moves, not merely against concurrent updates of
    # the moved row.
    cursor.execute(
        """
        SELECT id, node_id, contrato_id, parent_id, is_initial_template, version
        FROM causa WHERE contrato_id=%s ORDER BY id FOR UPDATE
        """,
        (int(contract_id),),
    )
    return [dict(row) for row in cursor.fetchall()]


def _descendant_ids(causes: list[dict[str, Any]], cause_id: int) -> list[int]:
    children: dict[int, list[int]] = {}
    for row in causes:
        if row.get("parent_id") is not None:
            children.setdefault(int(row["parent_id"]), []).append(int(row["id"]))
    result: list[int] = []
    pending = list(children.get(int(cause_id), []))
    visited: set[int] = set()
    while pending:
        current = pending.pop(0)
        if current in visited:
            continue
        visited.add(current)
        result.append(current)
        pending.extend(children.get(current, []))
    return result


def move_cause_transaction(
    *,
    cause_id: int,
    parent_id: int | None,
    expected_version: int,
    reason: str,
    actor_id: str | None = None,
    correlation_id: str | None = None,
) -> dict[str, Any]:
    """Move one cause and its primary CAUSES edge in exactly one transaction."""
    if not isinstance(expected_version, int) or isinstance(expected_version, bool):
        raise RcaVersionConflictError("expected_version debe ser numérico.")
    clean_reason = reason.strip() if isinstance(reason, str) else ""
    if not clean_reason or len(clean_reason) > 2000:
        raise RcaInvalidReasonError("reason debe ser texto no vacío de como máximo 2000 caracteres.")

    from . import relationship_repo

    with postgres_transaction() as cursor:
        cause = _cause_row(cursor, int(cause_id), lock=True)
        if not cause:
            raise RcaCauseNotFoundError("La causa indicada no existe.", details={"cause_id": cause_id})

        # Lock the complete contract tree before deriving descendants. This is
        # deliberately based on causa.parent_id, the business relationship;
        # graph edges are synchronised below, never used as a second authority.
        causes = _locked_contract_causes(cursor, int(cause["contrato_id"]))
        by_id = {int(row["id"]): row for row in causes}
        cause = by_id[int(cause_id)]
        if int(cause.get("version") or 1) != int(expected_version):
            raise RcaVersionConflictError(
                "La versión de la causa ya no es actual.",
                details={"cause_id": cause_id, "current_version": int(cause.get("version") or 1)},
            )

        old_parent_id = cause.get("parent_id")
        parent = None
        if parent_id is not None:
            if int(parent_id) == int(cause_id):
                raise RcaSelfParentError("Una causa no puede ser su propio padre.")
            parent = by_id.get(int(parent_id))
            if parent is None:
                # Distinguish an existing cause in another contract from a
                # truly absent target, as required by the public contract.
                cursor.execute("SELECT id, contrato_id FROM causa WHERE id=%s FOR UPDATE", (int(parent_id),))
                foreign = cursor.fetchone()
                if foreign:
                    raise RcaContractMismatchError("La causa padre pertenece a otro contrato.")
                raise RcaParentNotFoundError("La causa padre no existe.")
            if int(parent["contrato_id"]) != int(cause["contrato_id"]):
                raise RcaContractMismatchError("La causa y su padre deben pertenecer al mismo contrato.")
            descendants = _descendant_ids(causes, int(cause_id))
            if int(parent_id) in descendants:
                raise RcaCycleDetectedError("El destino pertenece al subárbol de la causa.")
            if cause.get("is_initial_template"):
                raise RcaRootPolicyError("La raíz inicial del contrato no puede convertirse en hija.")
        else:
            if cause.get("is_initial_template"):
                raise RcaRootPolicyError("La raíz inicial del contrato ya está protegida.")
            roots = [row for row in causes if row.get("parent_id") is None and int(row["id"]) != int(cause_id)]
            if roots:
                raise RcaRootPolicyError("El contrato sólo puede tener una raíz.")

        old_edges = relationship_repo.lock_primary_edges_for_child(cursor, int(cause["node_id"]))
        if len(old_edges) > 1:
            raise RcaPrimaryRelationConflictError("La causa tiene más de una relación primaria estructural.")

        new_parent_node_id = None
        if parent is not None:
            new_parent_node_id = int(parent["node_id"])
        else:
            cursor.execute("SELECT node_id FROM contrato WHERE id=%s FOR UPDATE", (int(cause["contrato_id"]),))
            contract = cursor.fetchone()
            if not contract or contract.get("node_id") is None:
                raise RcaRootPolicyError("El contrato no tiene nodo canónico para la raíz.")
            new_parent_node_id = int(contract["node_id"])

        next_version = int(cause.get("version") or 1) + 1
        cursor.execute(
            """
            UPDATE causa SET parent_id=%s, version=%s, updated_at=NOW()
            WHERE id=%s AND version=%s
            RETURNING id, contrato_id, parent_id, version
            """,
            (parent_id, next_version, int(cause_id), int(expected_version)),
        )
        updated = cursor.fetchone()
        if not updated:
            raise RcaVersionConflictError("La causa fue modificada concurrentemente.")

        relationship_repo.replace_primary_cause_relationship(
            cursor,
            child_node_id=int(cause["node_id"]),
            parent_node_id=new_parent_node_id,
            contract_id=int(cause["contrato_id"]),
        )
        cursor.execute(
            """
            INSERT INTO causa_movimiento_auditoria(
                actor_id, contract_id, cause_id, previous_parent_id, new_parent_id,
                expected_version, resulting_version, reason, correlation_id
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id, action, actor_id, contract_id, cause_id, previous_parent_id,
                      new_parent_id, expected_version, resulting_version, reason,
                      correlation_id, occurred_at, resultado
            """,
            (actor_id, int(cause["contrato_id"]), int(cause_id), old_parent_id, parent_id,
             int(expected_version), next_version, clean_reason, correlation_id),
        )
        audit = dict(cursor.fetchone())
        return {
            "cause": dict(updated),
            "moved_from": {"parent_id": old_parent_id},
            "moved_to": {"parent_id": parent_id},
            "affected_descendant_ids": _descendant_ids(causes, int(cause_id)),
            "primary_relationship": {
                "type": "CAUSES",
                "from_cause_id": int(cause_id),
                "to_cause_id": int(parent_id) if parent_id is not None else None,
                "from_node_id": new_parent_node_id,
                "to_node_id": int(cause["node_id"]),
            },
            "audit": audit,
        }
