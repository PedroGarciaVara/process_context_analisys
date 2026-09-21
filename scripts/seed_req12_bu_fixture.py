"""Load the BU fixture through the generic process-modeling persistence.

This is a fixture loader, not a BU/MACBU product model. It targets one
pre-existing canonical BPM process and never creates process history.
All rows owned by this loader carry the same seed/revision provenance so a
reseed can remove only its own rows before rebuilding them in one transaction.
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


TARGET_PROCESS_ID = "886ffe83-5235-4eb8-8c1d-528041518617"
SEED = "R12_BU_FIXTURE_V1"
FIXTURE_PATH = "requeriments_spec_driven_development/requerimiento_12/proceso_BU_estructurado.md"
NAMESPACE = UUID("f4ccf53d-29e5-4fb2-a34b-120260801000")

NODE_SPECS = [
    ("INPUT", "input", "Entrada de contexto BU/MACBU", "§1-§2"),
    ("PSA", "operation", "PSA — fabricación de bolsa", "§3"),
    ("DOSIFICACION", "operation", "Dosificación", "§4"),
    ("MARCADO", "operation", "Marcado de bolsa", "§6.1"),
    ("SOLDADURA", "operation", "Soldadura de cierre", "§6.2-§6.4"),
    ("EVACUACION", "operation", "Evacuación", "§6.2"),
    ("ROBOT", "operation", "Robot de transferencia", "§6.2"),
    ("CAJON", "stock", "Cajón metálico de salida", "§6.2"),
    ("OUTPUT", "output", "BU fabricada", "§1-§2"),
]

PROCESS_DESCRIPTION = (
    "Proceso general de fabricación de bolsas unitarias de producto químico: "
    "fabricación de la bolsa en PSA, dosificación secuencial en seis básculas, "
    "marcado, soldadura de cierre y evacuación hacia un cajón metálico. "
    "El fixture conserva la secuencia, los recursos, los controles y los gaps "
    "de trazabilidad descritos en las secciones §1-§14."
)

OPERATION_DETAILS = {
    "PSA": {
        "description": "Fabrica la bolsa de polietileno desde el rollo, forma y suelda el cilindro, realiza el cierre y el corte horizontal y coloca la bolsa en el trolley; el conjunto PSA1/PSA2 entrega un trolley con bolsa cada 20 cmin.",
        "objective": "Obtener una bolsa correctamente formada y cerrada para iniciar la dosificación.",
        "inputs": ["Rollo de polietileno", "Trolley vacío", "Receta de bolsa"],
        "outputs": ["Bolsa de polietileno colocada en trolley"],
        "parameters": ["Tensión del compensador", "Solapamiento", "Presión", "Tiempo y temperatura de soldadura", "Intensidad", "Número de ciclos"],
        "controls": ["Alineamiento del plástico", "Verticalidad de la soldadura", "Estado del teflón"],
        "equipment": ["PSA1", "PSA2"],
        "unknowns": ["Identidad, lote y consumo del rollo", "Señales del detector y del compensador"],
        "section": "§3",
    },
    "DOSIFICACION": {
        "description": "Dosifica los productos químicos en la bolsa mientras avanza por la báscula; cada puesto puede trabajar individualmente o en modo maestro-esclavo si ambos circuitos tienen el mismo producto.",
        "objective": "Alcanzar el peso objetivo de la receta dentro de la tolerancia del 1 % y con el menor tiempo de ciclo posible.",
        "inputs": ["Producto químico en bigbag y tolva", "Receta y peso objetivo", "Bolsa procedente de PSA"],
        "outputs": ["Bolsa dosificada", "Peso medido", "Hecho de fuera de tolerancia si aplica"],
        "parameters": ["vmax", "vmin", "K", "Retardo", "Columna de caída", "Tolerancia del 1 %", "Régimen 1/2/3"],
        "controls": ["Lectura de producto y puesto", "Limpieza y validación de Calidad al cambiar posición", "Maestro-esclavo solo con el mismo producto"],
        "equipment": [],
        "unknowns": ["Identidad final de bigbag, lote y stock residual", "Captura conectada de pesos y señales"],
        "section": "§4",
    },
    "MARCADO": {
        "description": "Marca las bolsas después de la dosificación y antes de la soldadura de cierre; el fixture confirma la etapa, pero no determina todavía la tecnología, posición ni validación registrada.",
        "objective": "Identificar la bolsa antes de su cierre y evacuación.",
        "inputs": ["Bolsa dosificada"], "outputs": ["Bolsa marcada"],
        "parameters": [], "controls": [], "equipment": [],
        "unknowns": ["Tecnología, contenido, posición y evidencia de validación"], "section": "§6.1",
    },
    "SOLDADURA": {
        "description": "Sujeta la bolsa, la posiciona con la mesa elevadora y ejecuta dos soldaduras laterales para cerrar el envase; después libera la bolsa al tapiz de evacuación. El ciclo conjunto descrito es de 22 cmin.",
        "objective": "Cerrar la bolsa sin apertura, quemado, desalineación ni tensión que provoque rotura.",
        "inputs": ["Bolsa marcada", "Trolley", "Parámetros de altura, tiempo, intensidad y temperatura"],
        "outputs": ["BU cerrada", "Resultado de inspección", "Defecto/parada si aplica"],
        "parameters": ["Altura de mesa", "Tiempo", "Intensidad", "Temperatura", "Geometría +/-2 mm"],
        "controls": ["Alineamiento de mordazas", "Uniformidad de soldadura", "Membrana, boquilla y pulsador", "Tensión de fajas"],
        "equipment": [],
        "unknowns": ["Payload de defectos y verificaciones geométricas"], "section": "§6.2-§6.4",
    },
    "EVACUACION": {
        "description": "Recibe la BU liberada por la soldadura y la evacua por el circuito correspondiente hacia el robot y el cajón metálico, manteniendo la secuencia del convoy.",
        "objective": "Trasladar la BU cerrada al almacenamiento de salida sin perder la trazabilidad del trolley y la receta.",
        "inputs": ["BU cerrada", "Trolley liberado"], "outputs": ["BU en cajón metálico"],
        "parameters": ["Circuito EV01/EV02", "Capacidad del cajón de 40–60 BU"], "controls": ["Secuencia del convoy"],
        "equipment": [], "unknowns": ["Identidad y capacidad exacta del robot/cajón"], "section": "§6.2",
    },
    "ROBOT": {
        "description": "Transfiere la BU evacuada al cajón metálico de salida; el fixture identifica el equipo y la operación, pero deja pendiente el detalle de cazo, cajón y capacidad exacta.",
        "objective": "Depositar la BU fabricada en el contenedor de salida.",
        "inputs": ["BU evacuada"], "outputs": ["BU depositada en cajón"],
        "parameters": [], "controls": [], "equipment": ["ROBOT"],
        "unknowns": ["Cazo, cajón y capacidad exacta"], "section": "§6.2",
    },
}

RESOURCE_DETAILS = {
    "MACBU": "Máquina industrial cuyo circuito conduce el trolley por PSA, BA01..BA06, marcado, SO1/SO2 y EV01/EV02.",
    "PSA1": "Primera máquina automática en serie que fabrica la bolsa desde el rollo de polietileno.",
    "PSA2": "Segunda máquina automática en serie que completa la fabricación y coloca una bolsa en el trolley vacío.",
    "BA01": "Primera báscula de la serie; dispone de cuatro puestos de dosificación y puede trabajar en modo individual o maestro-esclavo.",
    "BA02": "Segunda báscula de la serie; dispone de cuatro puestos de dosificación y puede trabajar en modo individual o maestro-esclavo.",
    "BA03": "Tercera báscula de la serie; dispone de cuatro puestos de dosificación y puede trabajar en modo individual o maestro-esclavo.",
    "BA04": "Cuarta báscula de la serie; dispone de cuatro puestos de dosificación y puede trabajar en modo individual o maestro-esclavo.",
    "BA05": "Quinta báscula de la serie; dispone de cuatro puestos de dosificación y puede trabajar en modo individual o maestro-esclavo.",
    "BA06": "Sexta báscula de la serie; dispone de cuatro puestos de dosificación y puede trabajar en modo individual o maestro-esclavo.",
    "SO1": "Primer circuito de soldadura de cierre con mesa elevadora, fajas neumáticas y dos elementos de soldadura.",
    "SO2": "Segundo circuito de soldadura de cierre con mesa elevadora, fajas neumáticas y dos elementos de soldadura.",
    "EV01": "Primer circuito de evacuación de la BU después de la soldadura.",
    "EV02": "Segundo circuito de evacuación de la BU después de la soldadura.",
    "ROBOT": "Equipo que transfiere la BU evacuada al cajón metálico de salida.",
}

RESOURCE_CODES = [
    "MACBU", "PSA1", "PSA2", "BA01", "BA02", "BA03", "BA04", "BA05", "BA06",
    "SO1", "SO2", "EV01", "EV02", "ROBOT",
]

MACHINE_ASSIGNMENTS = {
    "DOSIFICACION": ["BA01", "BA02", "BA03", "BA04", "BA05", "BA06"],
    "SOLDADURA": ["SO1", "SO2"],
    "EVACUACION": ["EV01", "EV02"],
    "PSA": ["PSA1", "PSA2"],
    "ROBOT": ["ROBOT"],
}

GAPS = [
    {"id": "BU-N-044", "section": "§8-§12", "impact": "generic-contract/source-integration", "description": "Databricks/PI-AVEVA remain provenance placeholders; no connector is implemented."},
    {"id": "BU-N-043", "section": "§12", "impact": "generic-contract/configuration", "description": "Exact identity/version contract for BU, trolley, RFID and bigbag remains open."},
    {"id": "BU-N-017", "section": "§4.5", "impact": "generic-contract/configuration", "description": "Cpk and optimisation inputs are described, not calculated or persisted."},
    {"id": "BU-N-024", "section": "§6.1", "impact": "non-blocking-terminology", "description": "Marking technology and recorded inspection payload are underspecified."},
]


def stable_id(kind: str, key: str) -> str:
    return str(uuid5(NAMESPACE, f"{SEED}:{kind}:{key}"))


def envelope(context_type: str, context_id: str, family: str, data: dict, section: str) -> dict:
    return {
        "context_type": context_type,
        "context_id": context_id,
        "family": family,
        "schema_version": "1.0",
        "data": data,
        "source": {"system": "fixture", "reference": FIXTURE_PATH, "section": section},
        "provenance": {"seed": SEED, "revision": 1, "quality": "fixture", "captured_at": "2026-08-01"},
    }


def node_properties(code: str, section: str) -> dict:
    return {
        "fixture": True,
        "seed": SEED,
        "external_key": f"{SEED}:node:{code}",
        "source": {"reference": FIXTURE_PATH, "section": section},
    }


def _canonical_process_name(process_code: str) -> str:
    return f"BPM:{SEED}:{process_code}"


def _canonical_contract_name(operation_code: str) -> str:
    return f"BPM:{SEED}:{operation_code}"


def _ensure_canonical_fixture(cur, process: dict) -> dict:
    """Resolve the BPM fixture to the existing canonical relational model.

    The process-modeling tables remain the BPM projection.  The legacy
    canonical model has no operation table, so one contract represents one
    generic operation within the canonical process and ``contrato_maquina``
    represents its many-to-many execution assignments.
    """
    process_name = _canonical_process_name(process["process_code"])
    cur.execute(
        "SELECT id, nombre FROM proceso WHERE nombre = %s FOR UPDATE",
        (process_name,),
    )
    process_row = cur.fetchone()
    if process_row is None:
        cur.execute(
            "INSERT INTO proceso(nombre) VALUES (%s) RETURNING id, nombre",
            (process_name,),
        )
        process_row = cur.fetchone()
    canonical_process_id = int(process_row["id"])

    machines = {}
    for code in RESOURCE_CODES:
        cur.execute("SELECT id, nombre FROM maquina WHERE nombre = %s FOR UPDATE", (code,))
        row = cur.fetchone()
        if row is None:
            cur.execute("INSERT INTO maquina(nombre) VALUES (%s) RETURNING id, nombre", (code,))
            row = cur.fetchone()
        machines[code] = {"id": int(row["id"]), "name": row["nombre"]}

    contracts = {}
    expected_links = {}
    for code, node_type, name, section in NODE_SPECS:
        if node_type != "operation":
            continue
        cur.execute(
            """SELECT id, proceso_id, nombre FROM contrato
               WHERE proceso_id = %s AND nombre = %s
               ORDER BY id FOR UPDATE""",
            (canonical_process_id, _canonical_contract_name(code)),
        )
        rows = cur.fetchall()
        if len(rows) > 1:
            raise RuntimeError(f"Contrato canónico duplicado para la operación {code}")
        detail = OPERATION_DETAILS.get(code, {})
        if rows:
            row = rows[0]
        else:
            cur.execute(
                """INSERT INTO contrato(proceso_id, nombre, objetivo)
                   VALUES (%s, %s, %s)
                   RETURNING id, proceso_id, nombre""",
                (canonical_process_id, _canonical_contract_name(code), detail.get("objective")),
            )
            row = cur.fetchone()
        if int(row["proceso_id"]) != canonical_process_id:
            raise RuntimeError(f"El contrato {code} no pertenece al proceso canónico esperado")
        contracts[code] = {"id": int(row["id"]), "name": row["nombre"]}

        machine_codes = MACHINE_ASSIGNMENTS.get(code, detail.get("equipment", []))
        expected_links[int(row["id"])] = {machines[machine_code]["id"] for machine_code in machine_codes}
        for machine_code in machine_codes:
            machine_id = machines[machine_code]["id"]
            cur.execute(
                """INSERT INTO contrato_maquina(contrato_id, maquina_id)
                   VALUES (%s, %s) ON CONFLICT DO NOTHING""",
                (int(row["id"]), machine_id),
            )

    # contrato_maquina has no provenance column.  The contract identity is
    # deterministic and seed-owned, so only links of these canonical
    # operation contracts are reconciled; unrelated contracts are untouched.
    for contract_id, machine_ids in expected_links.items():
        cur.execute(
            """DELETE FROM contrato_maquina
               WHERE contrato_id = %s AND NOT (maquina_id = ANY(%s::int[]))""",
            (contract_id, list(machine_ids)),
        )

    return {
        "proceso_id": canonical_process_id,
        "process_name": process_name,
        "machines": machines,
        "contracts": contracts,
        "expected_links": expected_links,
    }


def metadata_for(node_id: str, code: str, name: str, section: str, canonical: dict | None = None) -> dict:
    detail_key = "DOSIFICACION" if code.startswith("BA") else "SOLDADURA" if code.startswith("SO") else "EVACUACION" if code.startswith("EV") else code
    detail = OPERATION_DETAILS.get(detail_key, {})
    equipment = MACHINE_ASSIGNMENTS.get(code, detail.get("equipment", []) or ([code] if code in RESOURCE_CODES else []))
    canonical = canonical or {}
    return envelope(
        "node", node_id, "industrial_process_fixture",
        {
            "name": name,
            "fixture_key": code,
            "mission": detail.get("objective") or "Representar el recurso y su papel en el flujo de fabricación descrito en el fixture.",
            "purpose": detail.get("objective"),
            "description": detail.get("description") or RESOURCE_DETAILS.get(code) or f"Etapa de entrada/salida del proceso descrito en {section}.",
            "operation_description": detail.get("description") or RESOURCE_DETAILS.get(code) or f"Etapa de entrada/salida del proceso descrito en {section}.",
            "objective": detail.get("objective"),
            "inputs": detail.get("inputs", []), "outputs": detail.get("outputs", []),
            "parameters": detail.get("parameters", []), "quality_controls": detail.get("controls", []),
            "open_questions": detail.get("unknowns", []),
            "equipment": equipment,
            "materials": ["producto_quimico", "bolsa_polietileno"] if code.startswith("BA") or code == "PSA" else [],
            "indicators": ["tiempo_de_ciclo", "defectos", "paradas"],
            "declarative_contract": "La operación conserva su descripción funcional y sus particularidades de ejecución; los KPI se calculan bajo demanda y Databricks/PI-AVEVA son solo procedencia futura.",
            "operation_machine_assignments": [{"machine_ref": machine, "description": RESOURCE_DETAILS.get(machine, "Recurso asociado según el fixture.")} for machine in equipment],
            "canonical_ids": canonical,
            "fixture_section": section,
        }, section,
    )


def node_description(code: str, name: str) -> str:
    """Keep the BPM description and metadata operation description aligned."""
    detail_key = "DOSIFICACION" if code.startswith("BA") else "SOLDADURA" if code.startswith("SO") else "EVACUACION" if code.startswith("EV") else code
    return OPERATION_DETAILS.get(detail_key, {}).get("description") or RESOURCE_DETAILS.get(code) or f"Etapa del proceso descrita en el fixture ({name})."


def _count(cur, table: str, where: str, params: tuple) -> int:
    cur.execute(f"SELECT COUNT(*) AS count FROM {table} WHERE {where}", params)
    return int(cur.fetchone()["count"])


def _required_row(cur, operation: str) -> dict:
    row = cur.fetchone()
    if row is None:
        raise RuntimeError(
            f"{operation} encontró una identidad existente que no pertenece al seed {SEED}"
        )
    return dict(row)


def owned_counts(cur) -> dict:
    return {
        "nodes": _count(cur, "pm_process_node", "process_id = %s AND properties->>'seed' = %s", (TARGET_PROCESS_ID, SEED)),
        "transitions": _count(cur, "pm_process_transition", "process_id = %s AND properties->>'seed' = %s", (TARGET_PROCESS_ID, SEED)),
        "metadata": _count(cur, "pm_process_node_metadata", "metadata->'provenance'->>'seed' = %s", (SEED,)),
        "context_records": _count(cur, "pm_context_record", "process_id = %s AND provenance->>'seed' = %s", (TARGET_PROCESS_ID, SEED)),
    }


def _assert_target(cur) -> dict:
    cur.execute("""SELECT process_id, process_code, status, name AS process_name
                   FROM bpm_process WHERE process_id = %s""", (TARGET_PROCESS_ID,))
    process = cur.fetchone()
    if not process:
        cur.execute("""INSERT INTO bpm_process(process_id, process_code, name, status)
                       VALUES (%s, %s, %s, 'draft')
                       RETURNING process_id, process_code, status, name AS process_name""",
                    (TARGET_PROCESS_ID, SEED, f"Proceso fixture {SEED}"))
        process = cur.fetchone()
    if process["status"] not in {"draft", "active"}:
        raise RuntimeError(f"El proceso BPM exacto no está editable (status={process['status']}): {TARGET_PROCESS_ID}")
    # The exact target process is the fixture integration target. Keep its
    # existing process identity, while making the fixture-derived description
    # available through the existing process contract.
    cur.execute(
        """UPDATE bpm_process
              SET description = %s, updated_at = NOW()
            WHERE process_id = %s""",
        (PROCESS_DESCRIPTION, process["process_id"]),
    )
    return dict(process)


def _cleanup(cur) -> dict:
    before = owned_counts(cur)
    cur.execute("""DELETE FROM pm_process_transition
                   WHERE process_id = %s AND properties->>'seed' = %s""", (TARGET_PROCESS_ID, SEED))
    deleted_transitions = cur.rowcount
    cur.execute("""DELETE FROM pm_context_record
                   WHERE process_id = %s AND provenance->>'seed' = %s""", (TARGET_PROCESS_ID, SEED))
    deleted_context = cur.rowcount
    cur.execute("""DELETE FROM pm_process_node
                   WHERE process_id = %s AND properties->>'seed' = %s""", (TARGET_PROCESS_ID, SEED))
    deleted_nodes = cur.rowcount
    # Metadata of deleted nodes cascades; this also removes any old owned
    # metadata whose node was removed.  No unrelated node is touched.
    return {"before": before, "deleted": {"nodes": deleted_nodes, "transitions": deleted_transitions, "context_records": deleted_context}}


def _insert_node(cur, code: str, node_type: str, name: str, section: str, canonical: dict | None = None) -> str:
    node_id = stable_id("node", code)
    properties = node_properties(code, section)
    if canonical:
        properties["canonical_ids"] = canonical
    if node_type == "stock":
        cur.execute("""INSERT INTO pm_process_node
            (node_id, process_id, node_code, node_type, name, description, stock_capacity,
             stock_initial_quantity, stock_unit, properties)
            VALUES (%s, %s, %s, %s, %s, %s, 60, 0, 'BU', %s::jsonb)
            ON CONFLICT (process_id, node_code) DO UPDATE SET
              node_type = EXCLUDED.node_type, name = EXCLUDED.name,
              description = EXCLUDED.description, stock_capacity = EXCLUDED.stock_capacity,
              stock_initial_quantity = EXCLUDED.stock_initial_quantity,
              stock_unit = EXCLUDED.stock_unit, properties = EXCLUDED.properties,
              updated_at = NOW()
            WHERE pm_process_node.properties->>'seed' = EXCLUDED.properties->>'seed'
            RETURNING node_id""", (node_id, TARGET_PROCESS_ID, f"R12_BU_{code}", node_type, name, node_description(code, name), json.dumps(properties)))
    else:
        cur.execute("""INSERT INTO pm_process_node
            (node_id, process_id, node_code, node_type, name, description, properties)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (process_id, node_code) DO UPDATE SET
              node_type = EXCLUDED.node_type, name = EXCLUDED.name,
              description = EXCLUDED.description, properties = EXCLUDED.properties,
              updated_at = NOW()
            WHERE pm_process_node.properties->>'seed' = EXCLUDED.properties->>'seed'
            RETURNING node_id""", (node_id, TARGET_PROCESS_ID, f"R12_BU_{code}", node_type, name, node_description(code, name), json.dumps(properties)))
    actual_id = str(_required_row(cur, f"nodo {code}")["node_id"])
    detail = metadata_for(actual_id, code, name, section, canonical)
    cur.execute("""INSERT INTO pm_process_node_metadata (node_id, metadata)
                   VALUES (%s, %s::jsonb)
                   ON CONFLICT (node_id) DO UPDATE SET metadata = EXCLUDED.metadata, updated_at = NOW()
                   WHERE pm_process_node_metadata.metadata->'provenance'->>'seed' = EXCLUDED.metadata->'provenance'->>'seed'
                   RETURNING node_id""", (actual_id, json.dumps(detail)))
    _required_row(cur, f"metadatos del nodo {code}")
    return actual_id


def _insert_transition(cur, source_id: str, target_id: str, index: int) -> None:
    props = {"seed": SEED, "external_key": f"{SEED}:transition:{index}", "source": {"reference": FIXTURE_PATH, "section": "§2"}}
    cur.execute("""INSERT INTO pm_process_transition
        (transition_id, process_id, source_node_id, target_node_id, transition_type, label, properties)
        VALUES (%s, %s, %s, %s, 'sequence', 'fixture-flow', %s::jsonb)
        ON CONFLICT (process_id, source_node_id, target_node_id, transition_type) DO UPDATE SET
          label = EXCLUDED.label, properties = EXCLUDED.properties, updated_at = NOW()
        WHERE pm_process_transition.properties->>'seed' = EXCLUDED.properties->>'seed'
        RETURNING transition_id""",
        (stable_id("transition", str(index)), TARGET_PROCESS_ID, source_id, target_id, json.dumps(props)))
    _required_row(cur, f"relación {index}")


def _insert_context(cur, record_type: str, payload: dict, source_section: str, node_id: str | None = None, supports: dict | None = None, record_key: str | None = None) -> None:
    source = {"system": "fixture", "reference": FIXTURE_PATH, "section": source_section}
    provenance = {"seed": SEED, "revision": 1, "quality": "fixture"}
    cur.execute("""INSERT INTO pm_context_record
        (record_id, process_id, node_id, record_type, payload, source, provenance, execution_id, supports)
        VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s::jsonb)""",
        (stable_id("record", record_key or f"{record_type}:{source_section}:{node_id or 'process'}"), TARGET_PROCESS_ID, node_id,
         record_type, json.dumps(payload), json.dumps(source), json.dumps(provenance),
         f"{SEED}:execution:1" if record_type == "fact" else None, json.dumps(supports) if supports else None))


def _assert_operation_descriptions(cur) -> dict:
    """Prove that owned operations have a non-empty BPM description in SQL."""
    cur.execute(
        """SELECT COUNT(*) AS total,
                         COUNT(*) FILTER (WHERE NULLIF(BTRIM(description), '') IS NULL) AS empty
                   FROM pm_process_node
                  WHERE process_id = %s
                    AND properties->>'seed' = %s
                    AND node_type = 'operation'""",
        (TARGET_PROCESS_ID, SEED),
    )
    row = dict(cur.fetchone())
    if row["total"] == 0:
        raise RuntimeError(f"El seed {SEED} no persistió operaciones en el proceso {TARGET_PROCESS_ID}")
    if row["empty"]:
        raise RuntimeError(
            f"El proceso {TARGET_PROCESS_ID} conserva {row['empty']} operación(es) sin descripción persistida"
        )
    return {
        "operations": int(row["total"]),
        "operations_with_description": int(row["total"] - row["empty"]),
        "operations_without_description": int(row["empty"]),
    }


def _assert_canonical_mapping(cur, process: dict, canonical: dict, node_ids: dict) -> dict:
    """Validate the relational identity behind the BPM projection.

    This deliberately queries the canonical tables instead of trusting JSONB
    aliases.  The legacy model has no operation table; a contract is the
    documented generic-operation identity and contrato_maquina is its M:N
    execution relation.
    """
    cur.execute("SELECT id FROM proceso WHERE id = %s", (canonical["proceso_id"],))
    if cur.fetchone() is None:
        raise RuntimeError("El proceso canónico del fixture quedó huérfano")

    relation_count = 0
    for code, node_type, _name, _section in NODE_SPECS:
        if node_type != "operation":
            continue
        contract = canonical["contracts"].get(code)
        if not contract:
            raise RuntimeError(f"La operación {code} no tiene contrato canónico")
        cur.execute(
            """SELECT c.id, c.proceso_id, COUNT(cm.maquina_id) AS machine_count
                 FROM contrato c
                 LEFT JOIN contrato_maquina cm ON cm.contrato_id = c.id
                WHERE c.id = %s
                GROUP BY c.id, c.proceso_id""",
            (contract["id"],),
        )
        row = cur.fetchone()
        if not row or int(row["proceso_id"]) != canonical["proceso_id"]:
            raise RuntimeError(f"Contrato huérfano o fuera de proceso para {code}")
        expected = canonical["expected_links"].get(contract["id"], set())
        if int(row["machine_count"]) != len(expected):
            raise RuntimeError(f"Cardinalidad operación-máquina incorrecta para {code}")
        cur.execute(
            """SELECT cm.maquina_id
                 FROM contrato_maquina cm
                 JOIN maquina m ON m.id = cm.maquina_id
                WHERE cm.contrato_id = %s
                ORDER BY cm.maquina_id""",
            (contract["id"],),
        )
        actual = {int(item["maquina_id"]) for item in cur.fetchall()}
        if actual != expected:
            raise RuntimeError(f"Asignación operación-máquina no coincide para {code}")
        cur.execute("SELECT properties FROM pm_process_node WHERE node_id = %s", (node_ids[code],))
        properties = dict((cur.fetchone() or {}).get("properties") or {})
        ids = properties.get("canonical_ids") or {}
        if int(ids.get("proceso_id", -1)) != canonical["proceso_id"] or int(ids.get("contrato_id", -1)) != contract["id"]:
            raise RuntimeError(f"El nodo BPM {code} no expone identidad canónica estable")
        if set(int(value) for value in ids.get("maquina_ids", [])) != expected:
            raise RuntimeError(f"El nodo BPM {code} no expone sus máquinas canónicas")
        relation_count += len(actual)

    cur.execute(
        """SELECT COUNT(*) AS duplicates
             FROM (SELECT proceso_id, nombre FROM contrato
                    WHERE proceso_id = %s GROUP BY proceso_id, nombre HAVING COUNT(*) > 1) duplicates""",
        (canonical["proceso_id"],),
    )
    duplicates = int(cur.fetchone()["duplicates"])
    if duplicates:
        raise RuntimeError("El proceso canónico contiene contratos/operaciones duplicados")
    return {"operations": len(canonical["contracts"]), "operation_machine_links": relation_count, "duplicates": duplicates}


def load_fixture(cur) -> dict:
    process = _assert_target(cur)
    canonical = _ensure_canonical_fixture(cur, process)
    cleanup = _cleanup(cur)
    node_ids = {}
    for code, node_type, name, section in NODE_SPECS:
        detail_key = code if code in canonical["contracts"] else (
            "DOSIFICACION" if code.startswith("BA") else
            "SOLDADURA" if code.startswith("SO") else
            "EVACUACION" if code.startswith("EV") else code
        )
        canonical_node = {"proceso_id": canonical["proceso_id"]}
        if code in canonical["contracts"]:
            operation_machines = MACHINE_ASSIGNMENTS.get(code, OPERATION_DETAILS.get(detail_key, {}).get("equipment", []))
            canonical_node.update({
                "contrato_id": canonical["contracts"][code]["id"],
                "maquina_ids": [canonical["machines"][item]["id"] for item in operation_machines],
            })
        elif code in canonical["machines"]:
            canonical_node["maquina_id"] = canonical["machines"][code]["id"]
        node_ids[code] = _insert_node(cur, code, node_type, name, section, canonical_node)
    for index, (source, target) in enumerate(zip(NODE_SPECS, NODE_SPECS[1:]), start=1):
        _insert_transition(cur, node_ids[source[0]], node_ids[target[0]], index)
    _insert_context(cur, "declaration", envelope("process", TARGET_PROCESS_ID, "methodology", {
        "template": "promt.md", "instructions": "AGENTS.md", "fixture_scope": "coverage_and_gap_discovery",
        "causal_chain": "contract -> analysis -> methodology -> cause -> hypothesis -> evidence -> conclusion",
    }, "§10"), "§10")
    _insert_context(cur, "declaration", envelope("process", TARGET_PROCESS_ID, "fixture_gaps", {"gaps": GAPS}, "§11-§14"), "§11-§14")
    _insert_context(cur, "fact", envelope("process", TARGET_PROCESS_ID, "execution", {"event": "fixture_loaded", "target_process": TARGET_PROCESS_ID, "node_count": len(NODE_SPECS)}, "§0"), "§0")
    _insert_context(cur, "evidence", envelope("process", TARGET_PROCESS_ID, "fixture_report", {"path": "tests/req12_fixture_coverage.md", "gap_ids": [gap["id"] for gap in GAPS]}, "§14"), "§14")
    for code in RESOURCE_CODES:
        _insert_context(cur, "declaration", envelope("resource", stable_id("resource", code), "resource", {
            "external_key": code, "role": "equipment_or_machine", "description": RESOURCE_DETAILS[code],
            "capabilities": ["ejecutar la operación genérica asociada"], "placeholder": True,
            "canonical_machine_id": canonical["machines"][code]["id"],
            "canonical_process_id": canonical["proceso_id"],
        }, "§2/§6"), "§2/§6", record_key=f"resource:{code}")
    # Keep operation contracts and machine-specific execution details in the
    # existing generic context-record contract.  Operations remain unique BPM
    # activities; machines are references/attributes, never duplicated nodes.
    for code, node_type, name, section in NODE_SPECS:
        if node_type != "operation":
            continue
        detail_key = "DOSIFICACION" if code.startswith("BA") else "SOLDADURA" if code.startswith("SO") else "EVACUACION" if code.startswith("EV") else code
        detail = OPERATION_DETAILS.get(detail_key, {})
        operation_machines = MACHINE_ASSIGNMENTS.get(code, detail.get("equipment", []))
        _insert_context(cur, "declaration", envelope("node", node_ids[code], "operation_contract", {
            "operation_code": code, "operation_name": name, "description": detail.get("description") or node_description(code, name),
            "objective": detail.get("objective"), "inputs": detail.get("inputs", []), "outputs": detail.get("outputs", []),
            "parameters": detail.get("parameters", []), "controls": detail.get("controls", []),
            "canonical_process_id": canonical["proceso_id"],
            "canonical_contract_id": canonical["contracts"][code]["id"],
            "operation_machine_assignments": [{"machine_ref": machine, "machine_id": canonical["machines"][machine]["id"], "description": RESOURCE_DETAILS[machine]} for machine in operation_machines],
            "fixture_section": section,
        }, section), section, node_id=node_ids[code], record_key=f"operation-contract:{code}")
    _insert_context(cur, "declaration", envelope("process", TARGET_PROCESS_ID, "canonical_relational_mapping", {
        "proceso_id": canonical["proceso_id"],
        "contracts": {code: {"id": value["id"], "machine_ids": [canonical["machines"][machine]["id"] for machine in MACHINE_ASSIGNMENTS.get(code, OPERATION_DETAILS.get(code, {}).get("equipment", []))]} for code, value in canonical["contracts"].items()},
        "machines": {code: value["id"] for code, value in canonical["machines"].items()},
        "cardinality": "one generic operation contract to many canonical machines via contrato_maquina",
    }, "§2/§6"), "§2/§6", record_key="canonical-relational-mapping")
    description_evidence = _assert_operation_descriptions(cur)
    canonical_evidence = _assert_canonical_mapping(cur, process, canonical, node_ids)
    after = owned_counts(cur)
    return {"target_process": process, "canonical": canonical, "cleanup": cleanup, "loaded": {"nodes": len(NODE_SPECS), "transitions": len(NODE_SPECS) - 1, "resources": len(RESOURCE_CODES), "gaps": len(GAPS)}, "description_evidence": description_evidence, "canonical_evidence": canonical_evidence, "after": after}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="validate target and report owned counts without changing data")
    parser.add_argument("--json", action="store_true", help="emit machine-readable evidence")
    args = parser.parse_args()
    result = None
    try:
        with db_cursor() as cur:
            process = _assert_target(cur)
            if args.dry_run:
                result = {"target_process": process, "dry_run": True, "before": owned_counts(cur)}
            else:
                result = load_fixture(cur)
                result["dry_run"] = False
    except Exception as exc:
        print(f"ERROR: seed abortado y transacción revertida: {exc}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
