"""Consolidate the useful load-dosage fixture into its canonical BPM process.

The script is intentionally narrow and auditable.  It moves only the
``CARGAS_DOSIF`` operation, BN11..BN42 machine configuration and related
resource context from the duplicate ML fixture.  Everything else owned only
by the duplicate fixture is removed after a logical JSON backup is written.

Dry-run is the default.  Use ``--apply`` to commit the transaction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid5

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from psycopg2.extras import Json  # noqa: E402

from uc_bib_solv.modules.platform.infrastructure.postgres import get_connection  # noqa: E402


SOURCE_PROCESS_ID = "d320e817-5601-5fe4-937a-cefda5b5dd48"
TARGET_PROCESS_ID = "f247eee0-cfa1-4ea5-b4e6-fa4598a061b5"
PARENT_PROCESS_ID = "06757b45-a08d-4493-8012-db03325399c8"
SOURCE_OPERATION_ID = "9a8b4bed-6cf2-56a7-8457-b2d5ddf0bfff"
TARGET_CONTRACT_ID = 99
SOURCE_CONTRACT_ID = 159
BN_MACHINE_NAMES = ("BN11", "BN12", "BN21", "BN22", "BN31", "BN32", "BN41", "BN42")
SOURCE_DOCUMENT = "requerimientos_cliente/descripciones del proceso/test_dosificacion_cargas"
MIGRATION_KEY = "consolidate_duplicate_ml_process_v1"
MIGRATION_NAMESPACE = UUID("ae6fd183-f25a-4461-9e0e-15a1936c9124")
DEFAULT_BACKUP = ROOT / "artifacts" / "db-migrations" / "proceso_ml_fabricacion_before_consolidation.json"


def _canonical_ids(machine_ids=None):
    """Return the persistence contract; API adapters expose English aliases."""
    return {
        "proceso_id": 65,
        "contrato_id": TARGET_CONTRACT_ID,
        "maquina_ids": list(machine_ids if machine_ids is not None else range(322, 330)),
    }


def _json_default(value):
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _rows(cur, sql, params=()):
    cur.execute(sql, params)
    return [dict(row) for row in cur.fetchall()]


def _one(cur, sql, params=()):
    cur.execute(sql, params)
    row = cur.fetchone()
    return dict(row) if row else None


def _ids(rows, key="id"):
    return [row[key] for row in rows if row.get(key) is not None]


def inventory(cur) -> dict:
    source = _one(cur, "SELECT * FROM bpm_process WHERE process_id=%s", (SOURCE_PROCESS_ID,))
    target = _one(cur, "SELECT * FROM bpm_process WHERE process_id=%s", (TARGET_PROCESS_ID,))
    moved = _one(cur, "SELECT * FROM pm_process_node WHERE node_id=%s", (SOURCE_OPERATION_ID,))
    source_operational = _rows(cur, "SELECT * FROM proceso WHERE bpm_process_id=%s", (SOURCE_PROCESS_ID,))
    source_process_ids = _ids(source_operational)
    contracts = _rows(
        cur,
        """SELECT * FROM contrato
             WHERE bpm_process_id=%s
                OR bpm_node_id IN (SELECT node_id FROM pm_process_node WHERE process_id=%s)
                OR proceso_id = ANY(%s::int[])
             ORDER BY id""",
        (SOURCE_PROCESS_ID, SOURCE_PROCESS_ID, source_process_ids or [0]),
    )
    contract_ids = _ids(contracts)
    nodes = _rows(cur, "SELECT * FROM pm_process_node WHERE process_id=%s ORDER BY node_code", (SOURCE_PROCESS_ID,))
    node_ids = _ids(nodes, "node_id")
    causes = _rows(cur, "SELECT * FROM causa WHERE contrato_id=ANY(%s::int[]) ORDER BY id", (contract_ids or [0],))
    cause_ids = _ids(causes)
    hypotheses = _rows(cur, "SELECT * FROM hipotesis WHERE causa_id=ANY(%s::int[]) ORDER BY id", (cause_ids or [0],))
    hypothesis_ids = _ids(hypotheses)
    generic_ids = {
        *(_ids(source_operational, "node_id")),
        *(_ids(contracts, "node_id")),
        *(_ids(causes, "node_id")),
        *(_ids(hypotheses, "node_id")),
    }
    resource_context = _rows(
        cur,
        """SELECT * FROM pm_context_record
             WHERE process_id=%s AND payload->>'family'='resource'
             ORDER BY record_id""",
        (SOURCE_PROCESS_ID,),
    )
    declared_machine_ids = sorted({
        int(row["payload"]["data"]["canonical_machine_id"])
        for row in resource_context
        if str((row.get("payload") or {}).get("data", {}).get("canonical_machine_id", "")).isdigit()
    })
    machines = _rows(cur, "SELECT * FROM maquina WHERE id=ANY(%s::int[]) ORDER BY id", (declared_machine_ids or [0],))
    generic_ids.update(_ids(machines, "node_id"))
    return {
        "source": source,
        "target": target,
        "moved_operation": moved,
        "source_operational": source_operational,
        "nodes": nodes,
        "node_ids": node_ids,
        "contracts": contracts,
        "contract_ids": contract_ids,
        "causes": causes,
        "cause_ids": cause_ids,
        "hypotheses": hypotheses,
        "hypothesis_ids": hypothesis_ids,
        "resource_context": resource_context,
        "declared_machine_ids": declared_machine_ids,
        "machines": machines,
        "generic_node_ids": sorted(generic_ids),
    }


def snapshot(cur, inv: dict) -> dict:
    contract_ids = inv["contract_ids"] or [0]
    cause_ids = inv["cause_ids"] or [0]
    hypothesis_ids = inv["hypothesis_ids"] or [0]
    generic_ids = inv["generic_node_ids"] or [0]
    machine_ids = inv["declared_machine_ids"] or [0]
    source_node_ids = inv["node_ids"] or [str(UUID(int=0))]
    target_nodes = _rows(cur, "SELECT * FROM pm_process_node WHERE process_id=%s ORDER BY node_code", (TARGET_PROCESS_ID,))
    target_node_ids = _ids(target_nodes, "node_id")
    tables = {
        "bpm_process": _rows(cur, "SELECT * FROM bpm_process WHERE process_id IN (%s,%s)", (SOURCE_PROCESS_ID, TARGET_PROCESS_ID)),
        "proceso": _rows(cur, "SELECT * FROM proceso WHERE bpm_process_id IN (%s,%s) ORDER BY id", (SOURCE_PROCESS_ID, TARGET_PROCESS_ID)),
        "pm_process_node": inv["nodes"] + target_nodes,
        "pm_process_transition": _rows(cur, "SELECT * FROM pm_process_transition WHERE process_id IN (%s,%s) ORDER BY transition_id", (SOURCE_PROCESS_ID, TARGET_PROCESS_ID)),
        "pm_process_node_metadata": _rows(cur, "SELECT * FROM pm_process_node_metadata WHERE node_id=ANY(%s::uuid[]) ORDER BY node_id", (source_node_ids + target_node_ids,)),
        "pm_context_record": _rows(cur, "SELECT * FROM pm_context_record WHERE process_id IN (%s,%s) OR node_id=ANY(%s::uuid[]) ORDER BY record_id", (SOURCE_PROCESS_ID, TARGET_PROCESS_ID, source_node_ids + target_node_ids)),
        "contrato": inv["contracts"] + _rows(cur, "SELECT * FROM contrato WHERE id=%s", (TARGET_CONTRACT_ID,)),
        "contrato_maquina": _rows(cur, "SELECT * FROM contrato_maquina WHERE contrato_id=ANY(%s::int[]) OR contrato_id=%s ORDER BY contrato_id,maquina_id", (contract_ids, TARGET_CONTRACT_ID)),
        "machine_operation_configuration": _rows(cur, "SELECT * FROM machine_operation_configuration WHERE process_id IN (%s,%s) OR contract_id=ANY(%s::int[]) ORDER BY id", (SOURCE_PROCESS_ID, TARGET_PROCESS_ID, contract_ids)),
        "causa": inv["causes"],
        "hipotesis": inv["hypotheses"],
        "hypothesis_required_data": _rows(cur, "SELECT * FROM hypothesis_required_data WHERE hypothesis_node_id IN (SELECT node_id FROM hipotesis WHERE id=ANY(%s::int[])) ORDER BY id", (hypothesis_ids,)),
        "hypothesis_expected_evidence": _rows(cur, "SELECT * FROM hypothesis_expected_evidence WHERE hypothesis_node_id IN (SELECT node_id FROM hipotesis WHERE id=ANY(%s::int[])) ORDER BY id", (hypothesis_ids,)),
        "analisis_causas": _rows(cur, "SELECT * FROM analisis_causas WHERE contrato_id=ANY(%s::int[]) ORDER BY id", (contract_ids,)),
        "analisis_resultado": _rows(cur, "SELECT * FROM analisis_resultado WHERE causa_id=ANY(%s::int[]) OR hipotesis_id=ANY(%s::int[]) ORDER BY id", (cause_ids, hypothesis_ids)),
        "analisis_causas_detalle": _rows(cur, "SELECT * FROM analisis_causas_detalle WHERE causa_id=ANY(%s::int[]) OR hipotesis_id=ANY(%s::int[]) ORDER BY id", (cause_ids, hypothesis_ids)),
        "maquina": inv["machines"],
        "registro_maquina": _rows(cur, "SELECT * FROM registro_maquina WHERE maquina_id=ANY(%s::int[]) ORDER BY id", (machine_ids,)),
        "node": _rows(cur, "SELECT * FROM node WHERE id=ANY(%s::bigint[]) ORDER BY id", (generic_ids,)),
        "relationship": _rows(cur, "SELECT * FROM relationship WHERE parent_node_id=ANY(%s::bigint[]) OR child_node_id=ANY(%s::bigint[]) ORDER BY id", (generic_ids, generic_ids)),
    }
    canonical = json.dumps(tables, default=_json_default, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return {
        "format": "uc-bib-logical-backup-v1",
        "migration": MIGRATION_KEY,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_process_id": SOURCE_PROCESS_ID,
        "target_process_id": TARGET_PROCESS_ID,
        "restore_order": [
            "node", "bpm_process", "proceso", "maquina", "registro_maquina",
            "pm_process_node", "pm_process_node_metadata", "pm_process_transition",
            "contrato", "contrato_maquina", "machine_operation_configuration",
            "causa", "hipotesis", "hypothesis_required_data",
            "hypothesis_expected_evidence", "analisis_causas",
            "analisis_resultado", "analisis_causas_detalle", "relationship",
            "pm_context_record",
        ],
        "sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        "tables": tables,
    }


def write_backup(payload: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise RuntimeError(f"El backup ya existe y no se sobrescribirá: {path}")
    path.write_text(json.dumps(payload, default=_json_default, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _external_machine_references(cur, machine_ids: list[int], source_contract_ids: list[int]) -> list[dict]:
    return _rows(
        cur,
        """SELECT m.id,m.nombre,
                  (SELECT count(*) FROM contrato_maquina cm WHERE cm.maquina_id=m.id AND NOT (cm.contrato_id=ANY(%s::int[]))) AS other_contracts,
                  (SELECT count(*) FROM machine_operation_configuration moc WHERE moc.machine_id=m.id AND moc.process_id<>%s) AS other_configurations,
                  (SELECT count(*) FROM analisis_causas ac WHERE ac.maquina_id=m.id) AS analyses,
                  (SELECT count(*) FROM registro_maquina rm WHERE rm.maquina_id=m.id) AS registrations,
                  (SELECT count(*) FROM maquina child WHERE child.parent_maquina_id=m.id) AS children
             FROM maquina m WHERE m.id=ANY(%s::int[]) ORDER BY m.id""",
        (source_contract_ids or [0], SOURCE_PROCESS_ID, machine_ids or [0]),
    )


def _merge_operation_metadata(metadata: dict | None) -> dict:
    result = dict(metadata or {})
    data = dict(result.get("data") or {})
    data.pop("open_questions", None)
    data.update({
        "objective": "Dosificar las cargas reforzantes requeridas por la receta dentro de tolerancia y del tiempo de ciclo del MI.",
        "inputs": ["Negro de humo", "Sílice", "Receta", "Demanda del MI"],
        "outputs": ["Cargas reforzantes pesadas y descargadas en la tolva de introducción del MI"],
        "equipment": list(BN_MACHINE_NAMES),
        "parameters": ["Gran caudal", "Regulación", "Velocidad mínima", "K", "Retardo", "Media móvil de 5 ciclos"],
        "quality_controls": ["Cero inicial", "Peso estable", "Corrección por defecto mediante impulsos", "Retirada manual por exceso", "Cero final y producto retenido"],
        "canonical_ids": _canonical_ids(),
    })
    result.update({
        "context_type": "node",
        "context_id": SOURCE_OPERATION_ID,
        "family": "industrial_process",
        "schema_version": "1.0",
        "data": data,
        "source": {"system": "client_process_description", "reference": SOURCE_DOCUMENT, "section": "dosificacion"},
        "provenance": {"migration": MIGRATION_KEY, "copied_from_process_id": SOURCE_PROCESS_ID, "source_fixture": "R12_ML_FIXTURE_V1"},
    })
    return result


def consolidate(cur, inv: dict) -> dict:
    if not inv["source"]:
        operation = inv["moved_operation"]
        if operation and str(operation["process_id"]) == TARGET_PROCESS_ID:
            properties = dict(operation.get("properties") or {})
            properties["canonical_ids"] = _canonical_ids()
            cur.execute("UPDATE pm_process_node SET properties=%s,updated_at=NOW() WHERE node_id=%s", (Json(properties), SOURCE_OPERATION_ID))
            metadata_row = _one(cur, "SELECT metadata FROM pm_process_node_metadata WHERE node_id=%s", (SOURCE_OPERATION_ID,))
            metadata = dict((metadata_row or {}).get("metadata") or {})
            data = dict(metadata.get("data") or {})
            data["canonical_ids"] = _canonical_ids()
            metadata["data"] = data
            cur.execute("UPDATE pm_process_node_metadata SET metadata=%s,updated_at=NOW() WHERE node_id=%s", (Json(metadata), SOURCE_OPERATION_ID))
            return {"status": "already_applied", "operation_id": SOURCE_OPERATION_ID, "canonical_identity_normalized": True}
        raise RuntimeError("El proceso origen no existe y no se reconoce una consolidación previa")
    if not inv["target"]:
        raise RuntimeError("No existe el proceso canónico de Preparación de cargas reforzantes")
    operation = inv["moved_operation"]
    if not operation or str(operation["process_id"]) != SOURCE_PROCESS_ID:
        raise RuntimeError("No se encontró CARGAS_DOSIF dentro del proceso duplicado")
    target_contract = _one(cur, "SELECT * FROM contrato WHERE id=%s AND proceso_id=65", (TARGET_CONTRACT_ID,))
    if not target_contract:
        raise RuntimeError("No existe el contrato canónico 99 del proceso 65")

    source_machine_ids = [row["maquina_id"] for row in _rows(cur, "SELECT maquina_id FROM contrato_maquina WHERE contrato_id=%s ORDER BY maquina_id", (SOURCE_CONTRACT_ID,))]
    bn_rows = _rows(cur, "SELECT id,nombre,node_id FROM maquina WHERE nombre=ANY(%s) ORDER BY id", (list(BN_MACHINE_NAMES),))
    bn_ids = [row["id"] for row in bn_rows]
    if [row["nombre"] for row in bn_rows] != list(BN_MACHINE_NAMES) or set(source_machine_ids) != set(bn_ids):
        raise RuntimeError("La relación del contrato 159 no coincide exactamente con BN11..BN42")

    removable_machine_ids = [row["id"] for row in inv["machines"] if row["id"] not in bn_ids]
    external = _external_machine_references(cur, removable_machine_ids, inv["contract_ids"])
    blockers = [row for row in external if any(int(row[key]) for key in ("other_contracts", "other_configurations", "analyses", "registrations", "children"))]
    if blockers:
        raise RuntimeError(f"Hay máquinas del fixture con referencias externas; se aborta: {blockers}")

    properties = dict(operation.get("properties") or {})
    properties.pop("fixture", None)
    properties.pop("seed", None)
    properties["source"] = {"reference": SOURCE_DOCUMENT, "section": "dosificacion"}
    properties["migration"] = {"key": MIGRATION_KEY, "from_process_id": SOURCE_PROCESS_ID}
    properties["canonical_ids"] = _canonical_ids(bn_ids)
    cur.execute(
        """UPDATE pm_process_node
              SET process_id=%s,
                  name='Dosificación de cargas reforzantes',
                  description=%s,
                  properties=%s,
                  updated_at=NOW()
            WHERE node_id=%s""",
        (
            TARGET_PROCESS_ID,
            "Dosificación en BN11..BN42: cero, tres regímenes de caudal, estabilización y verificación de peso, corrección y descarga con control de cero final.",
            Json(properties),
            SOURCE_OPERATION_ID,
        ),
    )
    source_metadata = _one(cur, "SELECT metadata FROM pm_process_node_metadata WHERE node_id=%s", (SOURCE_OPERATION_ID,))
    merged_metadata = _merge_operation_metadata((source_metadata or {}).get("metadata"))
    cur.execute(
        """INSERT INTO pm_process_node_metadata(node_id,metadata)
             VALUES(%s,%s)
             ON CONFLICT(node_id) DO UPDATE SET metadata=EXCLUDED.metadata,updated_at=NOW()""",
        (SOURCE_OPERATION_ID, Json(merged_metadata)),
    )

    cur.execute("DELETE FROM pm_process_transition WHERE process_id=%s AND source_node_id=(SELECT node_id FROM pm_process_node WHERE process_id=%s AND node_code='IN') AND target_node_id=(SELECT node_id FROM pm_process_node WHERE process_id=%s AND node_code='OUT')", (TARGET_PROCESS_ID, TARGET_PROCESS_ID, TARGET_PROCESS_ID))
    for key, source_code, target_code, label in (
        ("input_to_dosage", "IN", None, "Material y demanda disponibles"),
        ("dosage_to_output", None, "OUT", "Cargas dosificadas para MI"),
    ):
        source_id = SOURCE_OPERATION_ID if source_code is None else _one(cur, "SELECT node_id FROM pm_process_node WHERE process_id=%s AND node_code=%s", (TARGET_PROCESS_ID, source_code))["node_id"]
        target_id = SOURCE_OPERATION_ID if target_code is None else _one(cur, "SELECT node_id FROM pm_process_node WHERE process_id=%s AND node_code=%s", (TARGET_PROCESS_ID, target_code))["node_id"]
        cur.execute(
            """INSERT INTO pm_process_transition(transition_id,process_id,source_node_id,target_node_id,transition_type,label,properties)
                 VALUES(%s,%s,%s,%s,'sequence',%s,%s)
                 ON CONFLICT(process_id,source_node_id,target_node_id,transition_type)
                 DO UPDATE SET label=EXCLUDED.label,properties=EXCLUDED.properties,updated_at=NOW()""",
            (str(uuid5(MIGRATION_NAMESPACE, key)), TARGET_PROCESS_ID, source_id, target_id, label, Json({"migration": MIGRATION_KEY})),
        )

    cur.execute("INSERT INTO contrato_maquina(contrato_id,maquina_id) SELECT %s,maquina_id FROM contrato_maquina WHERE contrato_id=%s AND maquina_id=ANY(%s::int[]) ON CONFLICT DO NOTHING", (TARGET_CONTRACT_ID, SOURCE_CONTRACT_ID, bn_ids))
    cur.execute(
        """UPDATE machine_operation_configuration
              SET process_id=%s,contract_id=%s,
                  specific_description=regexp_replace(specific_description,'^R12_ML_FIXTURE_V1: *',''),
                  updated_at=NOW()
            WHERE process_id=%s AND operation_id=%s AND machine_id=ANY(%s::int[])""",
        (TARGET_PROCESS_ID, TARGET_CONTRACT_ID, SOURCE_PROCESS_ID, SOURCE_OPERATION_ID, bn_ids),
    )
    moved_configurations = cur.rowcount
    if moved_configurations != 8:
        raise RuntimeError(f"Se esperaban 8 configuraciones BN y se migraron {moved_configurations}")

    moved_context = 0
    for row in inv["resource_context"]:
        machine_id = (row.get("payload") or {}).get("data", {}).get("canonical_machine_id")
        if machine_id not in bn_ids:
            continue
        provenance = dict(row.get("provenance") or {})
        provenance.update({"migration": MIGRATION_KEY, "copied_from_process_id": SOURCE_PROCESS_ID})
        cur.execute("UPDATE pm_context_record SET process_id=%s,provenance=%s,updated_at=NOW() WHERE record_id=%s", (TARGET_PROCESS_ID, Json(provenance), row["record_id"]))
        moved_context += cur.rowcount
    if moved_context != 8:
        raise RuntimeError(f"Se esperaban 8 contextos BN y se migraron {moved_context}")

    generic_delete_ids = set(inv["generic_node_ids"]) - {row.get("node_id") for row in bn_rows}
    cur.execute("DELETE FROM machine_operation_configuration WHERE process_id=%s", (SOURCE_PROCESS_ID,))
    cur.execute("DELETE FROM analisis_resultado WHERE causa_id=ANY(%s::int[]) OR hipotesis_id=ANY(%s::int[])", (inv["cause_ids"] or [0], inv["hypothesis_ids"] or [0]))
    cur.execute("DELETE FROM analisis_causas_detalle WHERE causa_id=ANY(%s::int[]) OR hipotesis_id=ANY(%s::int[])", (inv["cause_ids"] or [0], inv["hypothesis_ids"] or [0]))
    cur.execute("DELETE FROM analisis_causas WHERE contrato_id=ANY(%s::int[])", (inv["contract_ids"] or [0],))
    cur.execute("DELETE FROM contrato WHERE id=ANY(%s::int[])", (inv["contract_ids"] or [0],))
    cur.execute("DELETE FROM bpm_process WHERE process_id=%s", (SOURCE_PROCESS_ID,))
    if cur.rowcount != 1:
        raise RuntimeError("No se eliminó exactamente un proceso duplicado")
    cur.execute("DELETE FROM maquina WHERE id=ANY(%s::int[])", (removable_machine_ids or [0],))
    removed_machines = cur.rowcount
    cur.execute("DELETE FROM node WHERE id=ANY(%s::bigint[])", (sorted(generic_delete_ids) or [0],))

    return {
        "status": "applied",
        "operation_id": SOURCE_OPERATION_ID,
        "preserved_machine_ids": bn_ids,
        "moved_configurations": moved_configurations,
        "moved_context_records": moved_context,
        "removed_exclusive_machines": removed_machines,
    }


def verify(cur) -> dict:
    checks = {}
    checks["source_process_absent"] = _one(cur, "SELECT count(*) AS n FROM bpm_process WHERE process_id=%s", (SOURCE_PROCESS_ID,))["n"] == 0
    checks["operation_in_target"] = _one(cur, "SELECT count(*) AS n FROM pm_process_node WHERE node_id=%s AND process_id=%s", (SOURCE_OPERATION_ID, TARGET_PROCESS_ID))["n"] == 1
    checks["bn_machines_unique"] = _one(cur, "SELECT count(*) AS n FROM maquina WHERE nombre=ANY(%s)", (list(BN_MACHINE_NAMES),))["n"] == 8
    checks["bn_configurations"] = _one(cur, "SELECT count(*) AS n FROM machine_operation_configuration WHERE process_id=%s AND operation_id=%s AND contract_id=%s", (TARGET_PROCESS_ID, SOURCE_OPERATION_ID, TARGET_CONTRACT_ID))["n"] == 8
    checks["bn_contract_links"] = _one(cur, "SELECT count(*) AS n FROM contrato_maquina WHERE contrato_id=%s AND maquina_id IN (SELECT id FROM maquina WHERE nombre=ANY(%s))", (TARGET_CONTRACT_ID, list(BN_MACHINE_NAMES)))["n"] == 8
    checks["target_path"] = _one(cur, "SELECT count(*) AS n FROM pm_process_transition WHERE process_id=%s AND (source_node_id=%s OR target_node_id=%s)", (TARGET_PROCESS_ID, SOURCE_OPERATION_ID, SOURCE_OPERATION_ID))["n"] == 2
    identity = _one(cur, "SELECT properties->'canonical_ids' AS ids FROM pm_process_node WHERE node_id=%s", (SOURCE_OPERATION_ID,))
    checks["canonical_identity_contract"] = (identity or {}).get("ids") == _canonical_ids()
    checks["parent_relation"] = _one(cur, "SELECT count(*) AS n FROM pm_process_transition WHERE transition_id='d14e1b82-9e94-4a9e-937a-f9e7c08a3260' AND process_id=%s", (PARENT_PROCESS_ID,))["n"] == 1
    checks["configuration_identity"] = _one(cur, """SELECT count(*) AS n FROM machine_operation_configuration moc JOIN pm_process_node n ON n.node_id=moc.operation_id WHERE moc.process_id<>n.process_id""")["n"] == 0
    if not all(checks.values()):
        raise RuntimeError(f"Verificación post-migración fallida: {checks}")
    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="aplicar y confirmar la consolidación")
    parser.add_argument("--backup", type=Path, default=DEFAULT_BACKUP, help="ruta del backup lógico JSON")
    args = parser.parse_args()
    conn = get_connection()
    try:
        from psycopg2.extras import RealDictCursor

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT process_id FROM bpm_process WHERE process_id IN (%s,%s) FOR UPDATE", (SOURCE_PROCESS_ID, TARGET_PROCESS_ID))
            inv = inventory(cur)
            summary = {
                "source_exists": bool(inv["source"]),
                "source_nodes": len(inv["nodes"]),
                "source_contracts": len(inv["contracts"]),
                "source_machines": len(inv["machines"]),
                "target_operation_owner": str((inv["moved_operation"] or {}).get("process_id") or ""),
            }
            if not args.apply:
                conn.rollback()
                print(json.dumps({"status": "dry_run", "summary": summary}, ensure_ascii=False, indent=2))
                return 0
            if inv["source"]:
                backup = snapshot(cur, inv)
                write_backup(backup, args.backup)
            result = consolidate(cur, inv)
            checks = verify(cur)
            conn.commit()
            print(json.dumps({"result": result, "verification": checks, "backup": str(args.backup) if inv["source"] else None}, ensure_ascii=False, indent=2))
            return 0
    except Exception as exc:
        conn.rollback()
        print(f"ERROR: consolidación revertida: {exc}", file=sys.stderr)
        return 2
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
