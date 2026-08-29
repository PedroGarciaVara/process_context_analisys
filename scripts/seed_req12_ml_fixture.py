"""Load the ML manufacturing fixture into the existing generic BPM model.

The loader is deliberately fixture-scoped and idempotent.  It creates or
reuses only the exact generic process, canonical operation contracts/resources,
and rows marked with the
seed provenance.  It does not create ML-specific tables or pretend to ingest
PLC/MES/PI-AVEVA telemetry.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from uuid import UUID, uuid5

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor  # noqa: E402


SEED = "R12_ML_FIXTURE_V1"
PROCESS_CODE = "PROCESO_ML_FABRICACION"
PROCESS_NAME = "PROCESO_ML_FABRICACION"
FIXTURE_PATH = "requeriments_spec_driven_development/requerimiento_12/proceso_ML_estructurado.md"
NAMESPACE = UUID("f4ccf53d-29e5-4fb2-a34b-120260801001")
PROCESS_ID = str(uuid5(NAMESPACE, f"{SEED}:process:{PROCESS_CODE}"))

NODE_SPECS = [
    ("INPUT_ML", "input", "Demanda de Receta ML", "§8.1", "normal"),
    ("BU_APROV", "operation", "Aprovisionamiento de BUs", "§3/§8.1", "normal"),
    ("CAUCHO_APROV", "operation", "Aprovisionamiento de Caucho", "§4/§8.1", "normal"),
    ("CARGAS_DOSIF", "operation", "Dosificación Cargas PLC", "§5/§8.1", "normal"),
    ("SILANO_DOSIF", "operation", "Inyección de Silano", "§6.1/§8.1", "normal"),
    ("ACEITE_DOSIF", "operation", "Dosificación Aceites 60°C", "§6.2/§8.1", "normal"),
    ("MI_MEZCLADO", "operation", "Mezclado Interno MI", "§7/§8.1", "normal"),
    ("GOULOTTE_ESPERA", "stock", "Intermedia Goulotte", "§7/§8.1", "normal"),
    ("HA_HOMOALIMENTADOR", "operation", "Homogeneizado HA", "§2/§8.1", "normal"),
    ("DECISION_CALIDAD", "decision", "Control Ponderal y Calidad", "§8.1", "normal"),
    ("OUTPUT_MEZCLA", "output", "Mezcla de Caucho Terminada", "§8.1", "normal"),
    ("DESECHO_MATERIAL", "output", "Evacuación a Desecho", "§8.1", "waste"),
]

TRANSITIONS = [
    ("TR_01", "INPUT_ML", "BU_APROV", "sequence", "Inicio orden de mezcla"),
    ("TR_02", "INPUT_ML", "CAUCHO_APROV", "sequence", "Inicio orden de mezcla"),
    ("TR_03", "INPUT_ML", "CARGAS_DOSIF", "sequence", "Inicio orden de mezcla"),
    ("TR_04", "INPUT_ML", "SILANO_DOSIF", "sequence", "Inicio orden de mezcla"),
    ("TR_05", "INPUT_ML", "ACEITE_DOSIF", "sequence", "Inicio orden de mezcla"),
    ("TR_06", "BU_APROV", "MI_MEZCLADO", "sequence", "BU pesada OK"),
    ("TR_07", "BU_APROV", "DESECHO_MATERIAL", "branch", "BU fuera de tolerancia (desecho auto)"),
    ("TR_08", "CAUCHO_APROV", "MI_MEZCLADO", "sequence", "Caucho pesado OK"),
    ("TR_09", "CAUCHO_APROV", "DESECHO_MATERIAL", "branch", "Caucho fuera de tolerancia (marcha atrás)"),
    ("TR_10", "CARGAS_DOSIF", "MI_MEZCLADO", "sequence", "Cargas pesadas OK"),
    ("TR_11", "SILANO_DOSIF", "MI_MEZCLADO", "sequence", "Silano inyectado OK"),
    ("TR_12", "ACEITE_DOSIF", "MI_MEZCLADO", "sequence", "Aceite inyectado OK (60°C)"),
    ("TR_13", "MI_MEZCLADO", "GOULOTTE_ESPERA", "sequence", "Evacuación por silla"),
    ("TR_14", "GOULOTTE_ESPERA", "HA_HOMOALIMENTADOR", "sequence", "Descarga a HA (0-2 cmin)"),
    ("TR_15", "HA_HOMOALIMENTADOR", "DECISION_CALIDAD", "sequence", "Mezcla finalizada hacia control"),
    ("TR_16", "DECISION_CALIDAD", "OUTPUT_MEZCLA", "branch", "Parámetros y peso OK"),
    ("TR_17", "DECISION_CALIDAD", "DESECHO_MATERIAL", "branch", "Mezcla fuera de especificación"),
]

RESOURCE_CODES = [
    "MI10", "MI20", "MI30", "MI40", "BU11", "BU12", "BU21", "BU22", "BU23",
    "BU31", "BU32", "BU41", "BU42", "BN11", "BN12", "BN21", "BN22", "BN31",
    "BN32", "BN41", "BN42", "SI21", "SI31", "SI43", "GOULOTTE", "HA",
]

MACHINE_ASSIGNMENTS = {
    "BU_APROV": ["BU11", "BU12", "BU21", "BU22", "BU23", "BU31", "BU32", "BU41", "BU42"],
    "CAUCHO_APROV": ["MI10", "MI20", "MI30", "MI40"],
    "CARGAS_DOSIF": ["BN11", "BN12", "BN21", "BN22", "BN31", "BN32", "BN41", "BN42"],
    "SILANO_DOSIF": ["SI21", "SI31", "SI43"],
    "ACEITE_DOSIF": ["MI10", "MI20", "MI30", "MI40"],
    "MI_MEZCLADO": ["MI10", "MI20", "MI30", "MI40"],
    "HA_HOMOALIMENTADOR": ["HA"],
}

DETAILS = {
    "BU_APROV": {"objective": "Aprovisionar BUs verificadas por peso.", "inputs": ["BUs", "Receta"], "outputs": ["BUs listas", "Rechazo"], "parameters": ["40-60 BUs por cajón", "6-10 pasos por tapiz"], "controls": ["Peso OK", "Retirada manual en Línea 4"], "description": "Verificación en báscula y avance por tapiz de pasos de los circuitos BU11..BU42."},
    "CAUCHO_APROV": {"objective": "Aprovisionar caucho pesado para la mezcla.", "inputs": ["Balancelas de caucho"], "outputs": ["Caucho OK", "Desecho por marcha atrás"], "parameters": ["Buffer 17-20 balancelas", "2 balancelas y 2 tapices en Línea 4"], "controls": ["Peso OK", "Introducción única por MI"], "description": "Recepción en balancelas y verificación en tolva-báscula, incluida la opción fraccionada de Línea 4."},
    "CARGAS_DOSIF": {"objective": "Completar la receta de cargas dentro de tolerancia.", "inputs": ["Negro de humo", "Sílice", "Receta"], "outputs": ["Cargas pesadas"], "parameters": ["Tres regímenes PLC", "K", "Retardo", "Media móvil de 5 ciclos", "Cpk > 1.3 (>50 kg), Cpk > 1.0 (<50 kg)"], "controls": ["Peso", "Impulsos por defecto", "Retirada manual por exceso"], "description": "Dosificación en BN11..BN42 con tecnologías de dos vis, vis único o tapiz único."},
    "SILANO_DOSIF": {"objective": "Inyectar silano medido para recetas con sílice.", "inputs": ["Silano"], "outputs": ["Silano inyectado"], "parameters": ["MDM Coriolis", "Tres regímenes", "Optimización ±3%"], "controls": ["Caudal y masa"], "description": "Inyección directa en MI en SI21, SI31 y SI43 mediante MDM Coriolis."},
    "ACEITE_DOSIF": {"objective": "Dosificar aceite manteniendo fluidez y tara correcta.", "inputs": ["Aceite"], "outputs": ["Aceite inyectado", "Defecto de cero si aplica"], "parameters": ["60 °C", "MDM o tolva-báscula", "Apertura de válvula", "Tres regímenes"], "controls": ["Picaje de desecho", "Temperatura estricta a 60 °C"], "description": "Inyección MDM o dosificación en circuito cerrado con picaje automático por exceso."},
    "MI_MEZCLADO": {"objective": "Fabricar la mezcla conforme a receta.", "inputs": ["BUs", "Caucho", "Cargas", "Silano", "Aceites"], "outputs": ["Mezcla evacuada"], "parameters": ["Tiempo, temperatura o energía", "3-6 respiros de pilón", "Aditivo de aceite con masa presente"], "controls": ["Silla", "Aceleración de paletas", "Retención de caucho"], "description": "Mezclado interno en MI10..MI40 con paletas, comasticación, adiciones y respiros de pilón."},
    "HA_HOMOALIMENTADOR": {"objective": "Homogeneizar y acondicionar la mezcla para la etapa posterior.", "inputs": ["Mezcla desde Goulotte"], "outputs": ["Mezcla homogeneizada"], "parameters": ["Descarga Goulotte 0-2 cmin"], "controls": ["Disponibilidad de HA"], "description": "Mezclado secundario y adición final después de la descarga de la Goulotte."},
}

GAPS = [
    {"id": "ML-N-001", "section": "§3-§6", "description": "No existe contrato de identidad y trazabilidad de lotes para caucho, negro, sílice, aceites y BUs."},
    {"id": "ML-N-002", "section": "§3.2", "description": "No se registra ni alerta la retención manual de BUs en Línea 4."},
    {"id": "ML-N-003", "section": "§4.2", "description": "El modo fraccionado de Línea 4 queda como declaración, sin configuración operacional especializada."},
    {"id": "ML-N-004", "section": "§5.3-§5.4", "description": "No hay histórico PLC de K, retardo, columna ni media móvil."},
    {"id": "ML-N-005", "section": "§6.2", "description": "No se ingieren temperaturas continuas ni eventos de defecto de cero."},
    {"id": "ML-N-006", "section": "§7", "description": "No se registran curvas de respiros de pilón ni correlación con energía/temperatura."},
    {"id": "ML-N-007", "section": "§7", "description": "No se captura telemetría de aceleración de paletas ni verificación de retención en silla."},
    {"id": "ML-LOAD-001", "section": "§9", "description": "PLC, MES/SCADA y PI-AVEVA quedan registrados solo como procedencia declarada; no se inventan conectores ni hechos."},
    {"id": "ML-N-008", "section": "§2.1", "description": "La secuencia posterior HA-HomoFinalizador-báscula-calandra-refrigerador-apilador se conserva como descripción de salida, pero no como nodos/equipos operativos independientes."},
    {"id": "ML-N-009", "section": "§1/§5", "description": "No se persisten recetas, proporciones, tolerancias ni trazabilidad de lotes; solo se conserva su necesidad declarada en el detalle del proceso."},
    {"id": "ML-N-010", "section": "§5.3-§5.4/§6", "description": "Las fórmulas, umbrales Cpk, ajustes ±3% y media móvil se conservan como metadata declarativa; no se persisten muestras, curvas ni resultados calculados."},
    {"id": "ML-N-011", "section": "§3.2/§4.2/§6.2/§7", "description": "Las reglas de intervención manual, fraccionado, defecto de cero, aceleración de paletas y retención se proyectan como controles/labels, sin hechos industriales ni alertas operativas."},
]


def sid(kind: str, key: str) -> str:
    return str(uuid5(NAMESPACE, f"{SEED}:{kind}:{key}"))


def contract_snapshot() -> dict:
    """Return the offline, reproducible ML contract used by the loader.

    This intentionally describes the generic persistence projection, not a
    claim that PostgreSQL currently contains these rows.  It is useful when
    the runtime database is unavailable and keeps the coverage test honest.
    """
    return {
        "process_code": PROCESS_CODE,
        "process_id": PROCESS_ID,
        "seed": SEED,
        "generic_tables": [
            "bpm_process", "pm_process_node",
            "pm_process_transition", "pm_process_node_metadata",
            "pm_context_record", "proceso", "maquina", "contrato",
            "contrato_maquina", "machine_operation_configuration",
        ],
        "counts": {
            "nodes": len(NODE_SPECS),
            "transitions": len(TRANSITIONS),
            "resources": len(RESOURCE_CODES),
            "operation_nodes": sum(node_type == "operation" for _, node_type, *_ in NODE_SPECS),
            "gaps": len(GAPS),
        },
        "persisted_as_metadata_or_projection": [
            "process identity and BPM graph",
            "node detail envelope family/schema_version/data/source/provenance",
            "generic resource and canonical machine references",
            "operation-to-machine configuration projection",
            "declarations, one execution fact and one fixture evidence record",
        ],
        "gaps": GAPS,
    }


def envelope(context_type: str, context_id: str, family: str, data: dict, section: str) -> dict:
    return {"context_type": context_type, "context_id": context_id, "family": family, "schema_version": "1.0", "data": data,
            "source": {"system": "fixture", "reference": FIXTURE_PATH, "section": section},
            "provenance": {"seed": SEED, "revision": 1, "quality": "fixture", "captured_at": "2026-08-04"}}


def _target(cur, create: bool = True) -> dict:
    cur.execute("SELECT * FROM bpm_process WHERE process_code = %s FOR UPDATE", (PROCESS_CODE,))
    process = cur.fetchone()
    if process is None:
        if not create:
            return {"process": {"process_id": PROCESS_ID, "process_code": PROCESS_CODE, "name": PROCESS_NAME, "status": "draft", "prospective": True}}
        cur.execute("""INSERT INTO bpm_process (process_id, process_code, name, description, status)
                       VALUES (%s, %s, %s, %s, 'draft') RETURNING *""", (PROCESS_ID, PROCESS_CODE, PROCESS_NAME, PROCESS_DESCRIPTION))
        process = cur.fetchone()
    elif str(process["process_id"]) != PROCESS_ID:
        raise RuntimeError("La definición existente tiene process_code ML pero un process_id no perteneciente al seed")
    elif process["name"] != PROCESS_NAME:
        raise RuntimeError("La definición existente no conserva el nombre exacto requerido")
    if create:
        cur.execute("""UPDATE bpm_process SET description = %s, updated_at = NOW()
                       WHERE process_id = %s""", (PROCESS_DESCRIPTION, PROCESS_ID))
    return {"process": dict(process)}


PROCESS_DESCRIPTION = "Proceso generalista de fabricación de mezclas de caucho para neumáticos, estructurado desde las secciones §1-§14 del fixture ML."


def _canonical(cur) -> dict:
    cur.execute("SELECT id, nombre, bpm_process_id FROM proceso WHERE bpm_process_id = %s FOR UPDATE", (PROCESS_ID,))
    row = cur.fetchone()
    if row is None:
        cur.execute("INSERT INTO proceso(nombre, bpm_process_id) VALUES (%s, %s) RETURNING id, nombre, bpm_process_id", (PROCESS_NAME, PROCESS_ID))
        row = cur.fetchone()
    process_id = int(row["id"])
    machines = {}
    for code in RESOURCE_CODES:
        cur.execute("SELECT id, nombre FROM maquina WHERE nombre = %s FOR UPDATE", (code,))
        machine = cur.fetchone()
        if machine is None:
            cur.execute("INSERT INTO maquina(nombre) VALUES (%s) RETURNING id, nombre", (code,))
            machine = cur.fetchone()
        machines[code] = dict(machine)
    contracts = {}
    for code, node_type, *_ in NODE_SPECS:
        if node_type != "operation":
            continue
        name = f"BPM:{SEED}:{code}"
        cur.execute("SELECT id, proceso_id, nombre FROM contrato WHERE proceso_id = %s AND nombre = %s ORDER BY id FOR UPDATE", (process_id, name))
        rows = cur.fetchall()
        if len(rows) > 1:
            raise RuntimeError(f"Contrato canónico duplicado para {code}")
        if rows:
            contract = rows[0]
        else:
            cur.execute("INSERT INTO contrato(proceso_id, bpm_process_id, nombre, objetivo) VALUES (%s, %s, %s, %s) RETURNING id, proceso_id, bpm_process_id, nombre", (process_id, PROCESS_ID, name, DETAILS.get(code, {}).get("objective")))
            contract = cur.fetchone()
        contracts[code] = dict(contract)
        expected = MACHINE_ASSIGNMENTS.get(code, [])
        for machine_code in expected:
            cur.execute("INSERT INTO contrato_maquina(contrato_id, maquina_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (contract["id"], machines[machine_code]["id"]))
        cur.execute("DELETE FROM contrato_maquina WHERE contrato_id = %s AND NOT (maquina_id = ANY(%s::int[]))", (contract["id"], [machines[c]["id"] for c in expected]))
    return {"process_id": process_id, "machines": machines, "contracts": contracts}


def _cleanup(cur) -> dict:
    before = _counts(cur)
    cur.execute("DELETE FROM pm_process_transition WHERE process_id = %s AND properties->>'seed' = %s", (PROCESS_ID, SEED))
    transitions = cur.rowcount
    cur.execute("DELETE FROM pm_context_record WHERE process_id = %s AND provenance->>'seed' = %s", (PROCESS_ID, SEED))
    context = cur.rowcount
    cur.execute("DELETE FROM machine_operation_configuration WHERE process_id = %s AND specific_description LIKE %s", (PROCESS_ID, f"%{SEED}%"))
    configurations = cur.rowcount
    cur.execute("DELETE FROM pm_process_node WHERE process_id = %s AND properties->>'seed' = %s", (PROCESS_ID, SEED))
    nodes = cur.rowcount
    return {"before": before, "deleted": {"nodes": nodes, "transitions": transitions, "context_records": context, "machine_operation_configurations": configurations}}


def _counts(cur) -> dict:
    result = {}
    for key, table, where, params in [
        ("nodes", "pm_process_node", "process_id = %s AND properties->>'seed' = %s", (PROCESS_ID, SEED)),
        ("transitions", "pm_process_transition", "process_id = %s AND properties->>'seed' = %s", (PROCESS_ID, SEED)),
        ("metadata", "pm_process_node_metadata", "metadata->'provenance'->>'seed' = %s", (SEED,)),
        ("context_records", "pm_context_record", "process_id = %s AND provenance->>'seed' = %s", (PROCESS_ID, SEED)),
        ("machine_operation_configurations", "machine_operation_configuration", "process_id = %s AND specific_description LIKE %s", (PROCESS_ID, f"%{SEED}%")),
    ]:
        cur.execute(f"SELECT COUNT(*) AS count FROM {table} WHERE {where}", params)
        result[key] = int(cur.fetchone()["count"])
    return result


def _insert_node(cur, code: str, node_type: str, name: str, section: str, canonical: dict) -> str:
    node_id = sid("node", code)
    detail = DETAILS.get(code, {})
    props = {"fixture": True, "seed": SEED, "external_key": f"{SEED}:node:{code}", "source": {"reference": FIXTURE_PATH, "section": section}, "canonical_ids": canonical}
    stock = node_type == "stock"
    output_role = "waste" if code == "DESECHO_MATERIAL" else "normal" if node_type == "output" else None
    cur.execute("""INSERT INTO pm_process_node
        (node_id, process_id, node_code, node_type, name, description, output_role, stock_capacity, stock_initial_quantity, stock_unit, properties)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
        ON CONFLICT (process_id,node_code) DO UPDATE SET node_type=EXCLUDED.node_type,name=EXCLUDED.name,description=EXCLUDED.description,output_role=EXCLUDED.output_role,stock_capacity=EXCLUDED.stock_capacity,stock_initial_quantity=EXCLUDED.stock_initial_quantity,stock_unit=EXCLUDED.stock_unit,properties=EXCLUDED.properties,updated_at=NOW()
        WHERE pm_process_node.properties->>'seed' = EXCLUDED.properties->>'seed' RETURNING node_id""",
        (node_id, PROCESS_ID, code, node_type, name, detail.get("description", name), output_role, 20 if stock else None, 0 if stock else None, "cmin" if stock else None, json.dumps(props)))
    row = cur.fetchone()
    if row is None:
        raise RuntimeError(
            f"El nodo {code} ya existe en el proceso ML y no pertenece al seed {SEED}"
        )
    actual = str(row["node_id"])
    metadata = envelope("node", actual, "industrial_process_fixture", {"name": name, "fixture_key": code, "description": detail.get("description", name), "objective": detail.get("objective"), "inputs": detail.get("inputs", []), "outputs": detail.get("outputs", []), "parameters": detail.get("parameters", []), "quality_controls": detail.get("controls", []), "equipment": MACHINE_ASSIGNMENTS.get(code, []), "open_questions": [g["id"] for g in GAPS if g["id"].startswith("ML-")], "canonical_ids": canonical}, section)
    cur.execute("""INSERT INTO pm_process_node_metadata(node_id, metadata) VALUES (%s,%s::jsonb)
                   ON CONFLICT(node_id) DO UPDATE SET metadata=EXCLUDED.metadata,updated_at=NOW()
                   WHERE pm_process_node_metadata.metadata->'provenance'->>'seed' = EXCLUDED.metadata->'provenance'->>'seed'""", (actual, json.dumps(metadata)))
    return actual


def _insert_transition(cur, key: str, source: str, target: str, transition_type: str, label: str, nodes: dict) -> None:
    props = {"seed": SEED, "external_key": f"{SEED}:transition:{key}", "source": {"reference": FIXTURE_PATH, "section": "§8.2"}}
    cur.execute("""INSERT INTO pm_process_transition(transition_id,process_id,source_node_id,target_node_id,transition_type,label,condition,properties)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                   ON CONFLICT(process_id,source_node_id,target_node_id,transition_type) DO UPDATE SET label=EXCLUDED.label,condition=EXCLUDED.condition,properties=EXCLUDED.properties,updated_at=NOW()
                   WHERE pm_process_transition.properties->>'seed' = EXCLUDED.properties->>'seed'
                   RETURNING transition_id""", (sid("transition", key), PROCESS_ID, nodes[source], nodes[target], transition_type, label, label if transition_type == "branch" else None, json.dumps(props)))
    if cur.fetchone() is None:
        raise RuntimeError(
            f"La transición {key} ya existe en el proceso ML y no pertenece al seed {SEED}"
        )


def _context(cur, record_type: str, owner_type: str, owner_id: str, family: str, data: dict, section: str, node_id: str | None = None, key: str | None = None) -> None:
    payload = envelope(owner_type, owner_id, family, data, section)
    cur.execute("""INSERT INTO pm_context_record(record_id,process_id,node_id,record_type,payload,source,provenance,execution_id)
                   VALUES (%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s)
                   ON CONFLICT(record_id) DO UPDATE SET process_id=EXCLUDED.process_id,node_id=EXCLUDED.node_id,record_type=EXCLUDED.record_type,payload=EXCLUDED.payload,source=EXCLUDED.source,provenance=EXCLUDED.provenance,execution_id=EXCLUDED.execution_id,updated_at=NOW()""", (sid("record", key or f"{family}:{owner_id}"), PROCESS_ID, node_id, record_type, json.dumps(payload), json.dumps(payload["source"]), json.dumps(payload["provenance"]), f"{SEED}:execution:1" if record_type == "fact" else None))


def load(cur, target: dict | None = None) -> dict:
    target = target or _target(cur)
    canonical = _canonical(cur)
    cleanup = _cleanup(cur)
    nodes = {}
    for code, node_type, name, section, _role in NODE_SPECS:
        ids = {"process_id": canonical["process_id"]}
        if code in canonical["contracts"]:
            ids.update({"contract_id": canonical["contracts"][code]["id"], "machine_ids": [canonical["machines"][m]["id"] for m in MACHINE_ASSIGNMENTS.get(code, [])]})
        nodes[code] = _insert_node(cur, code, node_type, name, section, ids)
    for transition in TRANSITIONS:
        _insert_transition(cur, *transition, nodes)
        _context(cur, "declaration", "process", PROCESS_ID, "bpm_process", {"process_code": PROCESS_CODE, "name": PROCESS_NAME, "description": PROCESS_DESCRIPTION, "fixture_version": "test"}, "§0-§1", key="bpm-process")
    _context(cur, "declaration", "process", PROCESS_ID, "methodology", {"fixture_scope": "coverage_and_gap_discovery", "levels": ["PLC/Autómata", "MES/SCADA", "PI-AVEVA"], "causal_chain": "contract -> analysis -> methodology -> cause -> hypothesis -> evidence -> conclusion"}, "§9-§10", key="methodology")
    _context(cur, "declaration", "process", PROCESS_ID, "fixture_gaps", {"gaps": GAPS}, "§11-§13", key="gaps")
    _context(cur, "fact", "process", PROCESS_ID, "execution", {"event": "fixture_loaded", "telemetry_ingested": False, "node_count": len(NODE_SPECS)}, "§9", key="execution")
    _context(cur, "evidence", "process", PROCESS_ID, "fixture_report", {"path": FIXTURE_PATH, "sections": ["§8.1", "§8.2"], "gap_ids": [g["id"] for g in GAPS]}, "§13", key="fixture-report")
    for code in RESOURCE_CODES:
        _context(cur, "declaration", "resource", sid("resource", code), "resource", {"external_key": code, "role": "equipment_or_machine", "description": f"Recurso declarado por el fixture ML ({code}).", "canonical_machine_id": canonical["machines"][code]["id"], "placeholder": True}, "§2-§7", key=f"resource:{code}")
    for code, node_type, name, section, _role in NODE_SPECS:
        if node_type != "operation":
            continue
        detail = DETAILS.get(code, {})
        contract_id = canonical["contracts"][code]["id"]
        for machine_code in MACHINE_ASSIGNMENTS.get(code, []):
            machine_id = canonical["machines"][machine_code]["id"]
            config = {"additional_inputs": detail.get("inputs", []), "specific_controls": detail.get("controls", []), "available_measurements": ["peso", "temperatura", "energía"], "specific_safety_rules": [], "specific_description": f"{SEED}: {detail.get('description', name)}"}
            cur.execute("""INSERT INTO machine_operation_configuration(machine_id,operation_id,process_id,contract_id,specific_description,additional_inputs,specific_controls,available_measurements,specific_safety_rules,validation_status)
                           VALUES (%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s::jsonb,'draft')
                           ON CONFLICT(machine_id,process_id,operation_id) DO UPDATE SET contract_id=EXCLUDED.contract_id,specific_description=EXCLUDED.specific_description,additional_inputs=EXCLUDED.additional_inputs,specific_controls=EXCLUDED.specific_controls,available_measurements=EXCLUDED.available_measurements,updated_at=NOW()""", (machine_id, nodes[code], PROCESS_ID, contract_id, config["specific_description"], json.dumps(config["additional_inputs"]), json.dumps(config["specific_controls"]), json.dumps(config["available_measurements"]), json.dumps(config["specific_safety_rules"])))
    cur.execute("""SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE NULLIF(BTRIM(description),'') IS NULL) AS empty FROM pm_process_node WHERE process_id=%s AND properties->>'seed'=%s AND node_type='operation'""", (PROCESS_ID, SEED))
    descriptions = dict(cur.fetchone())
    if descriptions["empty"]:
        raise RuntimeError("Hay operaciones ML sin descripción persistida")
    after = _counts(cur)
    return {"process_code": PROCESS_CODE, "process_id": PROCESS_ID, "canonical": canonical, "cleanup": cleanup, "loaded": {"nodes": len(NODE_SPECS), "transitions": len(TRANSITIONS), "resources": len(RESOURCE_CODES), "operations": len([n for n in NODE_SPECS if n[1] == "operation"]), "gaps": len(GAPS)}, "description_evidence": {"operations": descriptions["total"], "operations_with_description": descriptions["total"] - descriptions["empty"]}, "after": after, "target": target}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="validar el proceso y mostrar conteos sin modificar la BD")
    parser.add_argument("--contract", action="store_true", help="emitir el contrato ML offline sin conectar a PostgreSQL")
    parser.add_argument("--json", action="store_true", help="emitir evidencia JSON")
    args = parser.parse_args()
    if args.contract:
        print(json.dumps(contract_snapshot(), ensure_ascii=False, indent=2, default=str))
        return 0
    try:
        with db_cursor() as cur:
            target = _target(cur, create=not args.dry_run)
            result = {"target": target, "dry_run": True, "before": _counts(cur)} if args.dry_run else load(cur, target=target)
            if not args.dry_run:
                result["dry_run"] = False
    except Exception as exc:
        print(f"ERROR: seed ML abortado y transacción revertida: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
