from __future__ import annotations

import json
from uuid import UUID

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor
from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages


def _uuid(value: str) -> str:
    return str(UUID(str(value)))


def _node_record(row):
    result = dict(row)
    metadata = dict(result.get("metadata") or {})
    metadata_data = metadata.get("data") if isinstance(metadata.get("data"), dict) else {}
    # Preserve one stable API field for legacy metadata-only fixtures.
    result["description"] = (
        result.get("description")
        or metadata.get("operation_description")
        or metadata_data.get("operation_description")
        or metadata_data.get("detailed_description")
    )
    properties = dict(result.get("properties") or {})
    if result.get("node_type") == "operation":
        persisted_stages = properties.get("etapas")
        if persisted_stages is None:
            persisted_stages = {"schema_version": 1, "etapas": []}
        try:
            stages_envelope = canonical_stages(persisted_stages, envelope=True)
        except ValueError:
            # Existing non-stage properties remain readable; malformed stage
            # data is surfaced as an empty compatible projection until corrected via API.
            stages_envelope = {"schema_version": 1, "etapas": []}
        properties["etapas"] = stages_envelope
        result["etapas"] = stages_envelope["etapas"]
        result["stages_schema_version"] = stages_envelope["schema_version"]
    if result.get("stock_capacity") is not None:
        properties["stock"] = {
            "capacity": result["stock_capacity"],
            "initial_quantity": result["stock_initial_quantity"],
            "unit": result["stock_unit"],
        }
    result["properties"] = properties
    if result.get("node_type") == "output":
        result["output_role"] = result.get("output_role") or "normal"
    result["metadata"] = metadata
    return result


def _merge_stage_properties(properties: dict, stages):
    merged = dict(properties or {})
    merged["etapas"] = canonical_stages(stages, envelope=True)
    return merged


def _node_values(data):
    properties = dict(data.get("properties") or {})
    stock = properties.get("stock") if data.get("node_type") == "stock" else None
    return (
        data.get("output_role"),
        stock.get("capacity") if stock else None,
        stock.get("initial_quantity") if stock else None,
        stock.get("unit") if stock else None,
        json.dumps(properties),
    )


class ProcessRepository:
    def list(self):
        with db_cursor() as cur:
            cur.execute("""SELECT * FROM pm_process_definition ORDER BY process_code, process_id""")
            return [dict(row) for row in cur.fetchall()]

    def get(self, process_id):
        with db_cursor() as cur:
            cur.execute("SELECT * FROM pm_process_definition WHERE process_id = %s", (_uuid(process_id),))
            row = cur.fetchone()
            if not row:
                return None
            result = dict(row)
            cur.execute("SELECT * FROM pm_process_version WHERE process_id = %s ORDER BY version_number, version_id", (_uuid(process_id),))
            result["versions"] = [dict(item) for item in cur.fetchall()]
            return result

    def create(self, data):
        with db_cursor() as cur:
            cur.execute("""
                INSERT INTO pm_process_definition
                    (process_id, process_code, name, description, abstraction_level, parent_process_id, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (data.get("process_id"), data["process_code"], data["name"], data.get("description"),
                   data.get("abstraction_level", 0), data.get("parent_process_id"), data.get("status", "draft")))
            process = dict(cur.fetchone())
            cur.execute(
                """
                INSERT INTO proceso (nombre, bpm_process_id)
                VALUES (%s, %s)
                RETURNING id, nombre, bpm_process_id
                """,
                (process["name"], process["process_id"]),
            )
            return process

    def update(self, process_id, data):
        fields = {key: data[key] for key in ("name", "description", "abstraction_level", "parent_process_id", "status") if key in data}
        if not fields:
            return self.get(process_id)
        assignments = ", ".join(f"{key} = %s" for key in fields)
        values = list(fields.values()) + [_uuid(process_id)]
        with db_cursor() as cur:
            cur.execute(f"UPDATE pm_process_definition SET {assignments}, updated_at = NOW() WHERE process_id = %s RETURNING *", values)
            row = cur.fetchone()
            if row and "name" in fields:
                cur.execute(
                    "UPDATE proceso SET nombre=%s WHERE bpm_process_id=%s",
                    (row["name"], row["process_id"]),
                )
            return dict(row) if row else None


class VersionRepository:
    def list_by_process(self, process_id):
        with db_cursor() as cur:
            cur.execute("SELECT * FROM pm_process_version WHERE process_id = %s ORDER BY version_number, version_id", (_uuid(process_id),))
            return [dict(row) for row in cur.fetchall()]

    def get(self, version_id):
        with db_cursor() as cur:
            cur.execute("""
                SELECT v.*, p.process_code, p.name AS process_name, p.description AS process_description,
                       p.abstraction_level, p.parent_process_id, p.status AS process_status
                FROM pm_process_version v JOIN pm_process_definition p ON p.process_id = v.process_id
                WHERE v.version_id = %s
            """, (_uuid(version_id),))
            row = cur.fetchone()
            if not row:
                return None
            result = dict(row)
            cur.execute("""SELECT n.*, COALESCE(m.metadata, '{}'::jsonb) AS metadata
                          FROM pm_process_node n
                          LEFT JOIN pm_process_node_metadata m ON m.node_id = n.node_id
                          WHERE n.version_id = %s ORDER BY n.node_code, n.node_id""", (_uuid(version_id),))
            result["nodes"] = [_node_record(item) for item in cur.fetchall()]
            cur.execute("SELECT * FROM pm_process_transition WHERE version_id = %s ORDER BY source_node_id, target_node_id, transition_id", (_uuid(version_id),))
            result["transitions"] = [dict(item) for item in cur.fetchall()]
            # The canonical legacy model has no operation table.  Seeded
            # generic operations therefore expose their contract identity and
            # M:N machine IDs as a stable API projection from node properties.
            result["canonical_relations"] = [
                {
                    "node_id": node["node_id"],
                    "node_code": node["node_code"],
                    "process_id": (node.get("properties") or {}).get("canonical_ids", {}).get("proceso_id"),
                    "contract_id": (node.get("properties") or {}).get("canonical_ids", {}).get("contrato_id"),
                    "machine_ids": (node.get("properties") or {}).get("canonical_ids", {}).get("maquina_ids", []),
                }
                for node in result["nodes"]
                if node.get("node_type") == "operation"
                and (node.get("properties") or {}).get("canonical_ids", {}).get("contrato_id") is not None
            ]
            return result

    def create(self, process_id, data):
        with db_cursor() as cur:
            cur.execute("SELECT COALESCE(MAX(version_number), 0) + 1 AS next_number FROM pm_process_version WHERE process_id = %s", (_uuid(process_id),))
            next_number = data.get("version_number") or cur.fetchone()["next_number"]
            cur.execute("""
                INSERT INTO pm_process_version (version_id, process_id, version_number, change_description, status)
                VALUES (%s, %s, %s, %s, 'draft') RETURNING *
            """, (data.get("version_id"), _uuid(process_id), next_number, data.get("change_description")))
            return dict(cur.fetchone())

    def update(self, version_id, data):
        with db_cursor() as cur:
            cur.execute("""UPDATE pm_process_version SET change_description = COALESCE(%s, change_description), updated_at = NOW()
                          WHERE version_id = %s AND status = 'draft' RETURNING *""", (data.get("change_description"), _uuid(version_id)))
            row = cur.fetchone()
            return dict(row) if row else None

    def set_status(self, version_id, status):
        with db_cursor() as cur:
            cur.execute("UPDATE pm_process_version SET status = %s, updated_at = NOW() WHERE version_id = %s RETURNING *", (status, _uuid(version_id)))
            row = cur.fetchone()
            return dict(row) if row else None


class NodeRepository:
    def create(self, version_id, data):
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_process_node
                (node_id, version_id, node_code, node_type, name, description, child_process_id, output_role,
                 stock_capacity, stock_initial_quantity, stock_unit, properties)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb) RETURNING *""",
                (data.get("node_id"), _uuid(version_id), data["node_code"], data["node_type"], data["name"],
                 data.get("description"), data.get("child_process_id"), *_node_values(data)))
            return _node_record(cur.fetchone())

    def get(self, node_id):
        with db_cursor() as cur:
            cur.execute("SELECT * FROM pm_process_node WHERE node_id = %s", (_uuid(node_id),))
            row = cur.fetchone()
            return _node_record(row) if row else None

    def update(self, node_id, data):
        fields = {key: data[key] for key in ("node_code", "node_type", "name", "description", "child_process_id", "output_role", "properties") if key in data}
        if "properties" in fields:
            if "etapas" in fields["properties"]:
                fields["properties"] = _merge_stage_properties(fields["properties"], fields["properties"]["etapas"])
            stock = (fields["properties"] or {}).get("stock") if fields.get("node_type", data.get("node_type")) == "stock" else None
            fields.update({"stock_capacity": stock.get("capacity") if stock else None, "stock_initial_quantity": stock.get("initial_quantity") if stock else None, "stock_unit": stock.get("unit") if stock else None})
        if not fields:
            return self.get(node_id)
        assignments = ", ".join(f"{key} = %s{'::jsonb' if key == 'properties' else ''}" for key in fields)
        values = [json.dumps(value) if key == "properties" else value for key, value in fields.items()] + [_uuid(node_id)]
        with db_cursor() as cur:
            cur.execute(f"""UPDATE pm_process_node n SET {assignments}, updated_at = NOW()
                FROM pm_process_version v WHERE n.node_id = %s AND n.version_id = v.version_id AND v.status = 'draft' RETURNING n.*""", values)
            row = cur.fetchone()
            return _node_record(row) if row else None

    def update_stages(self, node_id, stages):
        """Update only properties.etapas and preserve every other property."""
        with db_cursor() as cur:
            envelope = canonical_stages(stages, envelope=True)
            cur.execute(
                """UPDATE pm_process_node n SET properties = jsonb_set(
                    COALESCE(n.properties, '{}'::jsonb), '{etapas}', %s::jsonb, true),
                    updated_at = NOW()
                    FROM pm_process_version v
                    WHERE n.node_id = %s AND n.version_id = v.version_id AND v.status = 'draft'
                    RETURNING n.*""",
                (json.dumps(envelope), _uuid(node_id)),
            )
            row = cur.fetchone()
            return _node_record(row) if row else None

    def delete(self, node_id):
        with db_cursor() as cur:
            cur.execute("""DELETE FROM pm_process_node n USING pm_process_version v
                          WHERE n.node_id = %s AND n.version_id = v.version_id AND v.status = 'draft'
                          RETURNING n.node_id""", (_uuid(node_id),))
            return bool(cur.fetchone())

    def get_metadata(self, node_id):
        with db_cursor() as cur:
            cur.execute("SELECT metadata FROM pm_process_node_metadata WHERE node_id = %s", (_uuid(node_id),))
            row = cur.fetchone()
            return dict(row["metadata"] or {}) if row else {}

    def upsert_metadata(self, node_id, metadata):
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_process_node_metadata (node_id, metadata)
                          VALUES (%s, %s::jsonb)
                          ON CONFLICT (node_id) DO UPDATE SET metadata = EXCLUDED.metadata, updated_at = NOW()
                          RETURNING metadata, updated_at""", (_uuid(node_id), json.dumps(metadata)))
            row = cur.fetchone()
            return {"metadata": dict(row["metadata"] or {}), "updated_at": row["updated_at"]}

    def list_context_records(self, node_id=None, version_id=None, record_type=None):
        clauses, values = [], []
        if node_id:
            clauses.append("node_id = %s")
            values.append(_uuid(node_id))
        if version_id:
            clauses.append("version_id = %s")
            values.append(_uuid(version_id))
        if record_type:
            clauses.append("record_type = %s")
            values.append(record_type)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with db_cursor() as cur:
            cur.execute(f"SELECT * FROM pm_context_record {where} ORDER BY created_at, record_id", values)
            return [dict(row) for row in cur.fetchall()]

    def create_context_record(self, node_id, version_id, record):
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_context_record
                (node_id, version_id, record_type, payload, source, provenance, execution_id, supports)
                VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s::jsonb)
                RETURNING *""", (node_id, version_id, record["record_type"], json.dumps(record["payload"]),
                                  json.dumps(record["source"]), json.dumps(record["provenance"]),
                                  record.get("execution_id"), json.dumps(record.get("supports")) if record.get("supports") is not None else None))
            return dict(cur.fetchone())


class TransitionRepository:
    def create(self, version_id, data):
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_process_transition
                (transition_id, version_id, source_node_id, target_node_id, transition_type, label, condition, properties)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb) RETURNING *""",
                (data.get("transition_id"), _uuid(version_id), _uuid(data["source_node_id"]), _uuid(data["target_node_id"]),
                 data["transition_type"], data.get("label"), data.get("condition"), json.dumps(data.get("properties") or {})))
            return dict(cur.fetchone())

    def get(self, transition_id):
        with db_cursor() as cur:
            cur.execute("SELECT * FROM pm_process_transition WHERE transition_id = %s", (_uuid(transition_id),))
            row = cur.fetchone()
            return dict(row) if row else None

    def delete(self, transition_id):
        with db_cursor() as cur:
            cur.execute("""DELETE FROM pm_process_transition t USING pm_process_version v
                          WHERE t.transition_id = %s AND t.version_id = v.version_id AND v.status = 'draft' RETURNING t.transition_id""", (_uuid(transition_id),))
            return bool(cur.fetchone())
