"""Seed illustrative, agent-oriented metadata for existing operation nodes.

The INSERT is intentionally non-destructive: once an element has metadata, a
future seed run will not overwrite human-enriched content.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


COMMON_REFERENCES = [
    "requeriments_spec_driven_development/requerimiento_10/test_descripcion_procesos.md",
    "OMG BPMN Introduction to BPMN — annotations and activity documentation",
    "ISA-95 / IEC 62264 — material, equipment, personnel and operations context",
]

SPECIFIC = {
    "VERIF_ENT": {
        "purpose": "Confirmar que los productos dosificados que entran en fabricación corresponden con la referencia y el peso esperados.",
        "method_of_operation": "Recibir la carga, identificar cada producto y contrastar referencia y peso con la receta de fabricación. Separar y registrar cualquier discrepancia antes de alimentar el mezclador.",
        "inputs": ["Productos dosificados", "Receta de fabricación", "Tolerancias de peso y referencia"],
        "outputs": ["Carga conforme para el mezclador", "Incidencia de producto no conforme"],
        "quality_controls": ["Referencia de cada NIP", "Peso individual y peso total", "Trazabilidad de lote"],
    },
    "MEZCLADOR": {
        "purpose": "Homogeneizar cauchos, cargas y productos químicos respetando la receta de fabricación.",
        "method_of_operation": "Introducir los productos en el mezclador en el orden definido por la marcha mecánica y aplicar el ciclo de trabajo, temperatura y tiempo establecidos para la mezcla.",
        "inputs": ["Productos entrantes verificados", "Receta cuantitativa y cualitativa", "Marcha mecánica"],
        "outputs": ["Mezcla homogeneizada para HA"],
        "parameters": {"temperature": {"target": None, "tolerance": None, "unit": "°C"}, "cycle_time": {"target": None, "tolerance": None, "unit": "s"}},
    },
    "HA": {
        "purpose": "Reducir la temperatura de la mezcla antes de incorporar el azufre.",
        "method_of_operation": "Transferir la mezcla al equipo HA y controlar el recorrido y las condiciones de enfriamiento hasta alcanzar la ventana de temperatura que permite el aprovisionamiento de azufre.",
        "inputs": ["Mezcla homogeneizada"],
        "outputs": ["Mezcla enfriada para aprovisionamiento de azufre"],
        "quality_controls": ["Temperatura de salida dentro de tolerancia"],
    },
    "SULFUR": {
        "purpose": "Aprovisionar el azufre previsto en la receta antes de la homogeneización final.",
        "method_of_operation": "Identificar el azufre, verificar la cantidad requerida y añadirlo a la mezcla enfriada conforme a la receta y a las reglas de trazabilidad de materiales.",
        "inputs": ["Mezcla enfriada", "Azufre vulcanizante", "Receta de fabricación"],
        "outputs": ["Mezcla con azufre para HF"],
        "quality_controls": ["Referencia de azufre", "Cantidad dosificada", "Lote y caducidad"],
    },
    "HF": {
        "purpose": "Homogeneizar el azufre con el resto de productos y aportar el trabajo necesario para alcanzar los valores de fluidez.",
        "method_of_operation": "Aplicar el ciclo de HF definido en la marcha mecánica y verificar que el trabajo, tiempo y temperatura quedan dentro de las tolerancias de la receta.",
        "inputs": ["Mezcla con azufre"],
        "outputs": ["Mezcla preparada para pesado final"],
        "quality_controls": ["Fluidez", "Temperatura", "Tiempo de ciclo", "Trabajo aplicado"],
    },
    "PESO_FINAL": {
        "purpose": "Verificar el peso de la mezcla final antes de ponerla en forma.",
        "method_of_operation": "Pesar el batch terminado, comparar con el intervalo de tolerancia y marcar el resultado como conforme o no conforme.",
        "inputs": ["Mezcla terminada"],
        "outputs": ["Mezcla pesada conforme", "Producto no conforme"],
        "quality_controls": ["Peso final dentro de tolerancia", "Identificación del batch"],
    },
    "PUESTA_FORMA": {
        "purpose": "Extruir la mezcla en una lámina continua, identificarla y acondicionarla para su apilado.",
        "method_of_operation": "Pasar la mezcla por la máquina de perfilado, marcar la información del producto, aplicar anticolante, refrigerar y secar antes de apilar en paletas.",
        "inputs": ["Mezcla conforme", "Tinta de marcado", "Anticolante"],
        "outputs": ["Lámina identificada y acondicionada", "Paleta de producto"],
        "quality_controls": ["Perfil y espesor", "Marcado legible", "Temperatura de salida", "Secado del anticolante"],
    },
}


def metadata_for(code, name, process_code):
    specific = SPECIFIC.get(code, {})
    return {
        "schema_version": "1.0",
        "summary": specific.get("purpose", f"Operación {name} del proceso {process_code}."),
        "purpose": specific.get("purpose", "Pendiente de completar con el objetivo industrial de la operación."),
        "detailed_description": f"Elemento operativo {code} — {name}. Este contenido inicial es una base de contexto para agentes y debe enriquecerse con la ficha de proceso, la receta y los valores validados.",
        "method_of_operation": specific.get("method_of_operation", "Describir paso a paso cómo se ejecuta la operación, su orden, condiciones de inicio y fin, y la respuesta ante desviaciones."),
        "inputs": specific.get("inputs", []),
        "outputs": specific.get("outputs", []),
        "materials": [],
        "equipment": [],
        "personnel": [],
        "parameters": specific.get("parameters", {}),
        "quality_controls": specific.get("quality_controls", []),
        "acceptance_criteria": [],
        "safety_notes": [],
        "failure_modes": [],
        "references": COMMON_REFERENCES,
        "open_questions": ["Completar valores objetivo, tolerancias, equipo concreto y procedimiento de reacción ante no conformidad."],
        "source_context": {"process_code": process_code, "node_code": code, "example_seed": True},
    }


def main():
    count = 0
    with db_cursor() as cursor:
        cursor.execute("""SELECT n.node_id, n.node_code, n.name, v.process_id, p.process_code
                         FROM pm_process_node n
                         JOIN pm_process_version v ON v.version_id = n.version_id
                         JOIN pm_process_definition p ON p.process_id = v.process_id
                         WHERE n.node_type = 'operation'
                         ORDER BY p.process_code, n.node_code""")
        operations = cursor.fetchall()
        for row in operations:
            metadata = metadata_for(row["node_code"], row["name"], row["process_code"])
            cursor.execute("""INSERT INTO pm_process_node_metadata (node_id, metadata)
                          VALUES (%s, %s::jsonb) ON CONFLICT (node_id) DO NOTHING""", (row["node_id"], json.dumps(metadata)))
            count += cursor.rowcount
    print(f"seeded {count} operation metadata documents")


if __name__ == "__main__":
    main()
