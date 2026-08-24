"""Transactional, idempotent Req12 machine-model migration.

The correspondence file is deliberately explicit.  No operation is inferred
from a contract, machine name, JSON text, or visual proximity.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.postgres import get_connection  # noqa: E402
from uc_bib_solv.modules.bpm.domain.machine_modeling.validators import canonical_stages  # noqa: E402


REQUIRED = ("machine_id", "contract_id", "operation_id", "process_version_id", "process_id")

# Explicit fixture semantics. Machine IDs still come exclusively from
# pm_process_node.properties.canonical_ids; these labels never identify a
# machine by name or visual proximity.
MACHINE_TYPE_BY_OPERATION = {
    "PSA": ("PSA", "Fabricación de bolsa", "Forma, suelda y corta la bolsa de polietileno."),
    "DOSIFICACION": ("Báscula de dosificación", "Dosificación", "Dosifica producto químico conforme a receta y tolerancia."),
    "MARCADO": ("Marcadora", "Marcado", "Identifica la bolsa antes del cierre."),
    "SOLDADURA": ("Circuito de soldadura", "Soldadura", "Cierra la bolsa mediante el circuito de soldadura."),
    "EVACUACION": ("Circuito de evacuación", "Evacuación", "Traslada la BU cerrada al circuito de salida."),
    "ROBOT": ("Robot de transferencia", "Transferencia", "Transfiere la BU al contenedor de salida."),
}


def load_fixture_correspondences(cur, process_version_id: str) -> list[dict[str, Any]]:
    """Build rows only from explicit canonical_ids in the exact BPM version."""
    cur.execute(
        """
        SELECT n.node_id, n.node_code, n.description, n.version_id, v.process_id, n.properties
          FROM pm_process_node n
          JOIN pm_process_version v ON v.version_id = n.version_id
         WHERE n.version_id = %s AND n.node_type = 'operation'
         ORDER BY n.node_code, n.node_id
        """,
        (process_version_id,),
    )
    result = []
    for node in cur.fetchall():
        ids = dict((node["properties"] or {}).get("canonical_ids") or {})
        contract_id = ids.get("contrato_id")
        machine_ids = ids.get("maquina_ids")
        if contract_id in (None, "") or not isinstance(machine_ids, list) or not machine_ids:
            raise ValueError(f"Nodo BPM {node['node_code']} no tiene canonical_ids verificables")
        for machine_id in machine_ids:
            result.append({
                "machine_id": int(machine_id), "contract_id": int(contract_id),
                "operation_id": str(node["node_id"]), "process_version_id": str(node["version_id"]),
                "process_id": str(node["process_id"]), "specific_description": node["description"],
                "node_code": node["node_code"],
            })
    if not result:
        raise ValueError(f"No hay operaciones BPM con canonical_ids para {process_version_id}")
    return result


def ensure_machine_types(cur, correspondences: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Attach explicit fixture machines to their general machine type."""
    assignments = {}
    for item in correspondences:
        code = str(item.get("node_code") or "").removeprefix("R12_BU_")
        key = "DOSIFICACION" if code.startswith("DOSIFICACION") else code
        if key not in MACHINE_TYPE_BY_OPERATION:
            continue
        value = MACHINE_TYPE_BY_OPERATION[key]
        if item["machine_id"] in assignments and assignments[item["machine_id"]] != value:
            raise ValueError(f"Máquina {item['machine_id']} tiene tipos BPM incompatibles")
        assignments[item["machine_id"]] = value

    result = []
    for machine_id, (type_name, principle, description) in assignments.items():
        cur.execute(
            """
            INSERT INTO maquinas_tipo(nombre, descripcion, operating_principle, general_technical_description)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (nombre) DO NOTHING
            RETURNING id
            """,
            (type_name, principle, principle, description),
        )
        type_row = cur.fetchone()
        if type_row is None:
            cur.execute("SELECT id FROM maquinas_tipo WHERE nombre=%s", (type_name,))
            type_row = cur.fetchone()
        type_id = int(type_row["id"])
        cur.execute(
            """
            UPDATE maquina
               SET maquinas_tipo_id=%s,
                   specific_description=COALESCE(specific_description, %s)
             WHERE id=%s
             RETURNING id
            """,
            (type_id, f"Unidad canónica asociada al BPM mediante canonical_ids explícitos ({type_name}).", machine_id),
        )
        if cur.fetchone() is None:
            raise ValueError(f"machine_id no existe: {machine_id}")
        result.append({"machine_id": machine_id, "machine_type_id": type_id, "machine_type": type_name})
    return result


def load_correspondences(path: str | None) -> list[dict[str, Any]]:
    if not path:
        return []
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    rows = payload.get("correspondences", payload) if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        raise ValueError("correspondences debe ser una lista JSON")
    result = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict) or any(row.get(key) in (None, "") for key in REQUIRED):
            raise ValueError(f"correspondencia {index} incompleta: requiere {', '.join(REQUIRED)}")
        result.append(row)
    return result


def migrate(
    correspondences: list[dict[str, Any]],
    *,
    dry_run: bool = False,
    process_version_id: str | None = None,
) -> dict[str, Any]:
    conn = get_connection()
    report: dict[str, Any] = {"status": "dry_run" if dry_run else "applied", "correspondences": [], "exceptions": []}
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT pg_advisory_xact_lock(hashtext('req12-machine-model'))")
                cur.execute("SELECT COUNT(*) AS count FROM maquinas_tipo")
                report["machine_type_count_before"] = int(cur.fetchone()["count"])
                cur.execute("SELECT COUNT(*) AS count FROM maquina")
                report["machine_count_before"] = int(cur.fetchone()["count"])
                cur.execute("SELECT COUNT(*) AS count FROM contrato_maquina")
                report["legacy_contract_machine_count"] = int(cur.fetchone()["count"])
                cur.execute("SELECT COUNT(*) AS count FROM machine_operation_configuration")
                report["configuration_count_before"] = int(cur.fetchone()["count"])

                # Additive initialization only: existing stage trees are read
                # and validated, while historical operations receive the
                # canonical empty envelope without touching other properties.
                cur.execute("SELECT node_id, node_type, properties FROM pm_process_node ORDER BY node_id")
                stage_updates = 0
                for node in cur.fetchall():
                    if node["node_type"] != "operation":
                        continue
                    properties = dict(node["properties"] or {})
                    if "etapas" in properties:
                        try:
                            canonical_stages(properties["etapas"], envelope=True)
                        except ValueError as exc:
                            report["exceptions"].append({"node_id": str(node["node_id"]), "reason": str(exc)})
                        continue
                    cur.execute(
                        "UPDATE pm_process_node SET properties = jsonb_set(COALESCE(properties, '{}'::jsonb), '{etapas}', %s::jsonb, true) WHERE node_id=%s",
                        (json.dumps({"schema_version": 1, "etapas": []}), node["node_id"]),
                    )
                    stage_updates += 1
                report["stage_envelopes_initialized"] = stage_updates

                if process_version_id:
                    correspondences = load_fixture_correspondences(cur, process_version_id)
                    report["source"] = {
                        "kind": "pm_process_node.properties.canonical_ids",
                        "process_version_id": process_version_id,
                        "correspondence_count": len(correspondences),
                    }
                report["machine_types"] = ensure_machine_types(cur, correspondences)

                for index, item in enumerate(correspondences):
                    cur.execute(
                        """
                        SELECT m.id AS machine_id, c.id AS contract_id,
                               n.node_id AS operation_id, n.version_id AS process_version_id,
                               v.process_id
                          FROM maquina m
                          JOIN contrato_maquina cm ON cm.maquina_id = m.id AND cm.contrato_id = %s
                          JOIN contrato c ON c.id = cm.contrato_id
                          JOIN pm_process_node n ON n.node_id = %s
                          JOIN pm_process_version v ON v.version_id = n.version_id
                         WHERE m.id = %s AND n.node_type = 'operation'
                           AND n.version_id = %s AND v.process_id = %s
                        """,
                        (item["contract_id"], item["operation_id"], item["machine_id"], item["process_version_id"], item["process_id"]),
                    )
                    match = cur.fetchone()
                    if not match:
                        report["exceptions"].append({"index": index, "reason": "explicit BPM/contract correspondence did not validate", "item": item})
                        continue
                    cur.execute(
                        """
                        INSERT INTO machine_operation_configuration
                            (machine_id, operation_id, process_version_id, process_id, contract_id,
                             validation_status, specific_description)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (machine_id, process_version_id, operation_id)
                        DO UPDATE SET contract_id = EXCLUDED.contract_id,
                                      process_id = EXCLUDED.process_id,
                                      updated_at = NOW()
                        RETURNING id
                        """,
                        (match["machine_id"], match["operation_id"], match["process_version_id"], match["process_id"], match["contract_id"], item.get("validation_status", "draft"), item.get("specific_description")),
                    )
                    row = cur.fetchone()
                    report["correspondences"].append({"index": index, "configuration_id": int(row["id"]), "source": "explicit canonical_ids" if process_version_id else "explicit JSON", "bpm": dict(match)})

                cur.execute("SELECT COUNT(*) AS count FROM machine_operation_configuration")
                report["configuration_count_after"] = int(cur.fetchone()["count"])
                if dry_run or report["exceptions"]:
                    conn.rollback()
                    if report["exceptions"] and not dry_run:
                        report["status"] = "rolled_back"
        return report
    finally:
        conn.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--correspondence", help="JSON con correspondences explícitas")
    parser.add_argument("--from-bpm-version", help="Construye correspondences desde canonical_ids de una versión BPM exacta")
    parser.add_argument("--report", help="ruta de informe JSON")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.from_bpm_version and args.correspondence:
        parser.error("--from-bpm-version y --correspondence son excluyentes")
    try:
        report = migrate(
            load_correspondences(args.correspondence),
            dry_run=args.dry_run,
            process_version_id=args.from_bpm_version,
        )
    except Exception as exc:
        report = {
            "status": "blocked",
            "error": str(exc),
            "source": (
                {"kind": "pm_process_node.properties.canonical_ids", "process_version_id": args.from_bpm_version}
                if args.from_bpm_version else {"kind": "explicit JSON"}
            ),
        }
    if args.report:
        Path(args.report).write_text(json.dumps(report, indent=2, default=str, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, default=str, ensure_ascii=False))
    return 1 if report.get("exceptions") or report.get("status") == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(main())
