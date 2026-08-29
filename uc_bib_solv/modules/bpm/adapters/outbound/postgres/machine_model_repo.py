"""Persistence adapter for the three-level machine model.

The legacy ``contrato_maquina`` relation is intentionally read only here for
compatibility.  Machine-operation participation is stored in the dedicated
``machine_operation_configuration`` table.
"""

from __future__ import annotations

import json
from typing import Any

from psycopg2.extras import Json

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


CONFIG_FIELDS = (
    "additional_inputs",
    "specific_controls",
    "available_measurements",
    "specific_safety_rules",
)


def _json(value: Any) -> Json:
    return Json(value)


def get_machine_context(machine_id: int, operation_id: str | None = None, process_id: str | None = None) -> dict | None:
    """Return the canonical machine context without inferring relationships."""
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT m.*, mt.id AS machine_type_id, mt.nombre AS machine_type_name,
                   mt.technology_description, mt.nominal_capacity,
                   mt.operating_principle, mt.elements_zones_positions,
                   mt.control_systems, mt.common_technical_characteristics,
                   mt.common_limitations, mt.general_technical_description,
                   c.id AS machine_contract_id, c.nombre AS machine_contract_name
              FROM maquina m
              LEFT JOIN maquinas_tipo mt ON mt.id = m.maquinas_tipo_id
              LEFT JOIN contrato c ON c.id = m.contract_id
             WHERE m.id = %s
            """,
            (int(machine_id),),
        )
        machine = cur.fetchone()
        if not machine:
            return None

        clauses = ["moc.machine_id = %s"]
        values: list[Any] = [int(machine_id)]
        if operation_id:
            clauses.append("moc.operation_id = %s")
            values.append(operation_id)
        if process_id:
            clauses.append("moc.process_id = %s")
            values.append(process_id)
        cur.execute(
            f"""
            SELECT moc.*, n.node_code, n.name AS operation_name,
                   n.description AS operation_description,
                   n.properties AS operation_properties,
                   n.process_id, p.name AS process_name,
                   c.nombre AS configuration_contract_name,
                   c.proceso_id AS configuration_legacy_process_id
              FROM machine_operation_configuration moc
              JOIN pm_process_node n ON n.node_id = moc.operation_id
              JOIN bpm_process p ON p.process_id = n.process_id
              LEFT JOIN contrato c ON c.id = moc.contract_id
             WHERE {' AND '.join(clauses)}
             ORDER BY moc.process_id, moc.operation_id, moc.id
            """,
            tuple(values),
        )
        configurations = [dict(row) for row in cur.fetchall()]

    row = dict(machine)
    # Keep legacy column names available, but expose the canonical identity
    # expected by the machine model contract explicitly.
    canonical_machine_type_id = row.get("maquinas_tipo_id")
    row["machine_type_id"] = canonical_machine_type_id
    row["machine_id"] = row.get("id")
    machine_type = {
        "id": canonical_machine_type_id,
        "name": row.pop("machine_type_name", None),
        "technology_description": row.pop("technology_description", None),
        "nominal_capacity": row.pop("nominal_capacity", None),
        "operating_principle": row.pop("operating_principle", None),
        "elements_zones_positions": row.pop("elements_zones_positions", None),
        "control_systems": row.pop("control_systems", None),
        "common_technical_characteristics": row.pop("common_technical_characteristics", None),
        "common_limitations": row.pop("common_limitations", None),
        "general_technical_description": row.pop("general_technical_description", None),
    }
    selected_configuration = _operation_configuration(configurations, operation_id, process_id)
    direct_contract_id = row.pop("machine_contract_id", None)
    direct_contract_name = row.pop("machine_contract_name", None)
    effective_contract_id = direct_contract_id
    effective_contract_name = direct_contract_name
    if effective_contract_id is None and selected_configuration:
        effective_contract_id = selected_configuration.get("contract_id")
        effective_contract_name = selected_configuration.get("configuration_contract_name")
    contract = {"id": effective_contract_id, "name": effective_contract_name}
    relations = {
        "machine_id": int(row["id"]),
        "machine_type_id": canonical_machine_type_id,
        "contract_id": effective_contract_id,
        "process_id": selected_configuration.get("process_id") if selected_configuration else None,
        "operation_id": selected_configuration.get("operation_id") if selected_configuration else None,
        "legacy_process_id": selected_configuration.get("configuration_legacy_process_id") if selected_configuration else None,
    }
    return {
        "operation": _operation_block(configurations, operation_id, process_id),
        "machine_type": machine_type,
        "machine": row,
        "contract": contract if contract["id"] is not None else None,
        "machine_operation_configurations": configurations,
        "relations": relations,
        "rca": {"source": "existing_causal_context", "machine_id": int(machine_id)},
    }


def _operation_block(
    configurations: list[dict],
    operation_id: str | None = None,
    process_id: str | None = None,
) -> dict | None:
    if not configurations:
        return None
    first = next(
        (
            item for item in configurations
            if (not operation_id or str(item["operation_id"]) == str(operation_id))
            and (not process_id or str(item["process_id"]) == str(process_id))
        ),
        None,
    )
    if first is None:
        return None
    raw_stages = (first.get("operation_properties") or {}).get("etapas")
    if isinstance(raw_stages, list):
        stages = raw_stages
        schema_version = 1
    elif isinstance(raw_stages, dict):
        stages = raw_stages.get("etapas") or []
        schema_version = raw_stages.get("schema_version", 1)
    else:
        stages = []
        schema_version = 1
    return {
        "operation_id": str(first["operation_id"]),
        "process_id": str(first["process_id"]),
        "name": first["operation_name"],
        "description": first["operation_description"],
        "node_code": first["node_code"],
        "process_name": first["process_name"],
        "etapas": stages,
        "schema_version": schema_version,
    }


def _operation_configuration(
    configurations: list[dict],
    operation_id: str | None = None,
    process_id: str | None = None,
) -> dict | None:
    return next(
        (
            item for item in configurations
            if (not operation_id or str(item["operation_id"]) == str(operation_id))
            and (not process_id or str(item["process_id"]) == str(process_id))
        ),
        configurations[0] if configurations and not operation_id and not process_id else None,
    )


def list_configurations(machine_id: int) -> list[dict]:
    context = get_machine_context(machine_id)
    if context is None:
        raise ValueError("Máquina no encontrada.")
    return context["machine_operation_configurations"]


def create_configuration(payload: dict) -> dict:
    values = [
        payload["machine_id"], payload["operation_id"], payload["process_id"],
        payload.get("contract_id"), payload.get("specific_description"),
        *[_json(payload.get(field, [])) for field in CONFIG_FIELDS],
        payload.get("validation_status", "draft"), payload.get("valid_from"), payload.get("valid_to"),
    ]
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO machine_operation_configuration
                (machine_id, operation_id, process_id,
                 contract_id, specific_description, additional_inputs,
                 specific_controls, available_measurements, specific_safety_rules,
                 validation_status, valid_from, valid_to)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            tuple(values),
        )
        return dict(cur.fetchone())
