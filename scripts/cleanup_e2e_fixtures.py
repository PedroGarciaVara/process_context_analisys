"""Scoped E2E cleanup for Java, graph and Process Modeling fixtures.

This module deliberately has no reset/truncate path. Every destructive query is
preceded by an allowlist check and runs in one transaction; a rejected target
performs zero DELETEs.
"""
from __future__ import annotations

import argparse
import json
from typing import Any

from uc_bib_solv.modules.platform.infrastructure.postgres import get_connection

ALLOWED_PREFIXES = ("TEST_",)


class CleanupTargetError(ValueError):
    pass


def _allowed(value: Any) -> bool:
    return isinstance(value, str) and value.startswith(ALLOWED_PREFIXES)


def _require_target(cur, fixture: dict[str, Any], prefix: str | None) -> str:
    if prefix is not None and not _allowed(prefix):
        raise CleanupTargetError("cleanup requiere un prefijo TEST_ permitido")
    if not fixture and not prefix:
        raise CleanupTargetError("cleanup requiere IDs devueltos por el fixture o un prefijo TEST_")
    if prefix:
        return prefix
    # IDs are accepted only when the root records prove the TEST_ ownership.
    checks = (("proceso", "id", fixture.get("process_id"), "nombre"), ("contrato", "id", fixture.get("contract_id"), "nombre"), ("maquina", "id", fixture.get("machine_id"), "nombre"))
    found = []
    for table, key, value, label in checks:
        if value is None:
            continue
        cur.execute(f"SELECT {label} FROM {table} WHERE {key}=%s", (value,))
        row = cur.fetchone()
        if row and _allowed(row[0]):
            found.append(row[0])
        elif row:
            raise CleanupTargetError(f"target protegido: {table}.{key}={value}")
    if not found:
        # PM-only fixtures carry a process_code, while Java fixtures carry roots.
        code = fixture.get("process_code")
        if code and _allowed(code):
            return code
        raise CleanupTargetError("no se pudo demostrar ownership TEST_ del fixture")
    return found[0]


def cleanup_fixture(fixture: dict[str, Any] | None = None, *, prefix: str | None = None, connection=None) -> dict[str, Any]:
    conn = connection or get_connection()
    own_connection = connection is None
    deleted: dict[str, int] = {}
    try:
        with conn:
            with conn.cursor() as cur:
                owner = _require_target(cur, fixture or {}, prefix)
                like = f"{prefix or owner}%"
                # Resolve IDs before deletes. The allowlist is intentionally exact
                # and never falls back to a table-wide operation.
                cur.execute("SELECT id FROM proceso WHERE nombre LIKE %s", (like,))
                process_ids = [row[0] for row in cur.fetchall()]
                cur.execute("SELECT id FROM contrato WHERE nombre LIKE %s", (like,))
                contract_ids = [row[0] for row in cur.fetchall()]
                cur.execute("SELECT id FROM maquina WHERE nombre LIKE %s", (like,))
                machine_ids = [row[0] for row in cur.fetchall()]
                for key, values in (("process", process_ids), ("contract", contract_ids), ("machine", machine_ids)):
                    if fixture and not values:
                        explicit = fixture.get({"process": "process_id", "contract": "contract_id", "machine": "machine_id"}[key])
                        if explicit is not None:
                            values.append(int(explicit))
                    deleted[key + "_roots"] = len(values)

                if machine_ids:
                    cur.execute("DELETE FROM machine_operation_configuration WHERE machine_id = ANY(%s)", (machine_ids,)); deleted["machine_operation_configuration"] = cur.rowcount
                    cur.execute("DELETE FROM contrato_maquina WHERE maquina_id = ANY(%s)", (machine_ids,)); deleted["contract_machine"] = cur.rowcount
                    cur.execute("DELETE FROM registro_maquina WHERE maquina_id = ANY(%s)", (machine_ids,)); deleted["machine_registry"] = cur.rowcount
                    cur.execute("DELETE FROM analisis_resultado WHERE analisis_id IN (SELECT id FROM analisis_causas WHERE maquina_id = ANY(%s))", (machine_ids,)); deleted["analysis_results"] = cur.rowcount
                    cur.execute("DELETE FROM analisis_causas WHERE maquina_id = ANY(%s)", (machine_ids,)); deleted["analyses"] = cur.rowcount
                if contract_ids:
                    cur.execute("DELETE FROM analisis_resultado WHERE analisis_id IN (SELECT id FROM analisis_causas WHERE contrato_id = ANY(%s))", (contract_ids,)); deleted["contract_analysis_results"] = cur.rowcount
                    cur.execute("DELETE FROM analisis_causas WHERE contrato_id = ANY(%s)", (contract_ids,)); deleted["contract_analyses"] = cur.rowcount
                    cur.execute("DELETE FROM hypothesis_required_data WHERE hypothesis_node_id IN (SELECT node_id FROM hipotesis WHERE causa_id IN (SELECT id FROM causa WHERE contrato_id = ANY(%s)))", (contract_ids,)); deleted["hypothesis_required_data"] = cur.rowcount
                    cur.execute("DELETE FROM hypothesis_expected_evidence WHERE hypothesis_node_id IN (SELECT node_id FROM hipotesis WHERE causa_id IN (SELECT id FROM causa WHERE contrato_id = ANY(%s)))", (contract_ids,)); deleted["hypothesis_expected_evidence"] = cur.rowcount
                    cur.execute("DELETE FROM analisis_causas_detalle WHERE causa_id IN (SELECT id FROM causa WHERE contrato_id = ANY(%s)) OR hipotesis_id IN (SELECT id FROM hipotesis WHERE causa_id IN (SELECT id FROM causa WHERE contrato_id = ANY(%s)))", (contract_ids, contract_ids)); deleted["analysis_details"] = cur.rowcount
                    cur.execute("DELETE FROM analisis_resultado WHERE causa_id IN (SELECT id FROM causa WHERE contrato_id = ANY(%s)) OR hipotesis_id IN (SELECT id FROM hipotesis WHERE causa_id IN (SELECT id FROM causa WHERE contrato_id = ANY(%s)))", (contract_ids, contract_ids)); deleted["causal_results"] = cur.rowcount
                    cur.execute("DELETE FROM node WHERE legacy_table = 'hipotesis' AND legacy_id IN (SELECT id FROM hipotesis WHERE causa_id IN (SELECT id FROM causa WHERE contrato_id = ANY(%s)))", (contract_ids,)); deleted["hypothesis_nodes"] = cur.rowcount
                    cur.execute("DELETE FROM node WHERE legacy_table = 'causa' AND legacy_id IN (SELECT id FROM causa WHERE contrato_id = ANY(%s))", (contract_ids,)); deleted["cause_nodes"] = cur.rowcount
                    cur.execute("DELETE FROM node WHERE legacy_table = 'contrato' AND legacy_id = ANY(%s)", (contract_ids,)); deleted["contract_nodes"] = cur.rowcount
                    cur.execute("DELETE FROM hipotesis WHERE causa_id IN (SELECT id FROM causa WHERE contrato_id = ANY(%s))", (contract_ids,)); deleted["hypotheses"] = cur.rowcount
                    cur.execute("DELETE FROM relationship WHERE parent_node_id IN (SELECT node_id FROM causa WHERE contrato_id = ANY(%s)) OR child_node_id IN (SELECT node_id FROM causa WHERE contrato_id = ANY(%s))", (contract_ids, contract_ids)); deleted["relationships"] = cur.rowcount
                    cur.execute("DELETE FROM causa WHERE contrato_id = ANY(%s)", (contract_ids,)); deleted["causes"] = cur.rowcount
                    cur.execute("DELETE FROM contrato_maquina WHERE contrato_id = ANY(%s)", (contract_ids,)); deleted["contract_machine_by_contract"] = cur.rowcount
                if machine_ids:
                    cur.execute("DELETE FROM maquina WHERE id = ANY(%s)", (machine_ids,)); deleted["machines"] = cur.rowcount
                    cur.execute("DELETE FROM node WHERE legacy_table = 'maquina' AND legacy_id = ANY(%s)", (machine_ids,)); deleted["machine_nodes"] = cur.rowcount
                if contract_ids:
                    cur.execute("DELETE FROM contrato WHERE id = ANY(%s)", (contract_ids,)); deleted["contracts"] = cur.rowcount
                if process_ids:
                    cur.execute("DELETE FROM proceso WHERE id = ANY(%s)", (process_ids,)); deleted["processes"] = cur.rowcount
                cur.execute("DELETE FROM maquinas_tipo WHERE nombre LIKE %s AND NOT EXISTS (SELECT 1 FROM maquina WHERE maquina.maquinas_tipo_id = maquinas_tipo.id)", (like,)); deleted["machine_types"] = cur.rowcount
                cur.execute("DELETE FROM bpm_process WHERE process_code LIKE %s", (like,)); deleted["bpm_processes"] = cur.rowcount
                cur.execute("SELECT COUNT(*) FROM node WHERE code LIKE %s OR name LIKE %s", (like, like))
                remaining_nodes = cur.fetchone()[0]
                if remaining_nodes:
                    raise CleanupTargetError("quedan nodos TEST del fixture tras cleanup")
        return {"status": "cleaned", "idempotent": sum(deleted.values()) == 0, "owner": owner, "deleted": deleted}
    finally:
        if own_connection:
            conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cleanup E2E allowlisted fixtures")
    parser.add_argument("--prefix", help="prefijo TEST_ allowlisted")
    parser.add_argument("--fixture-json", help="JSON con IDs devueltos por el fixture")
    args = parser.parse_args()
    fixture = json.loads(args.fixture_json) if args.fixture_json else None
    print(json.dumps(cleanup_fixture(fixture, prefix=args.prefix), default=str))
