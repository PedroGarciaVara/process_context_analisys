from __future__ import annotations

import json

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor
from uc_bib_solv.modules.bpm.domain.machines.validators import canonical_stages
from uc_bib_solv.modules.bpm.domain.processes.rules import next_process_code
from uc_bib_solv.modules.bpm.domain.shared.value_objects import require_uuid as _require_uuid


def _uuid(value):
    """Normalize repository identifiers before passing them to PostgreSQL."""
    return _require_uuid(value, "identifier")

def _node_record(row):
    result = dict(row)
    properties = dict(result.get("properties") or {})
    if result.get("node_type") == "operation":
        # TODO estudiar migracion stages a modelo independiente o dentro de grafo de ralaciones node
        try:
            stages = canonical_stages(properties.get("etapas"), envelope=True)
        except ValueError:
            stages = {"schema_version": 1, "etapas": []}
        properties["etapas"] = stages
        result["etapas"] = stages["etapas"]
        result["stages_schema_version"] = stages["schema_version"]
    if result.get("stock_capacity") is not None:
        properties["stock"] = {"capacity": result["stock_capacity"], "initial_quantity": result["stock_initial_quantity"], "unit": result["stock_unit"]}
    result["properties"] = properties
    result["metadata"] = dict(result.get("metadata") or {})
    if result.get("node_type") == "output":
        result["output_role"] = result.get("output_role") or "normal"
    return result


def _node_values(data):
    properties = dict(data.get("properties") or {})
    stock = properties.get("stock") if data.get("node_type") == "stock" else None
    return (data.get("output_role"), stock.get("capacity") if stock else None,
            stock.get("initial_quantity") if stock else None, stock.get("unit") if stock else None,
            json.dumps(properties))


class ProcessRepository:
    allocates_process_codes = True
    def list(self):
        with db_cursor() as cur:
            cur.execute("SELECT * FROM bpm_process ORDER BY process_code, process_id")
            return [dict(row) for row in cur.fetchall()]

    def get(self, process_id):
        with db_cursor() as cur:
            cur.execute("SELECT * FROM bpm_process WHERE process_id=%s", (_uuid(process_id),))
            row = cur.fetchone()
            if not row:
                return None
            result = dict(row)
            cur.execute("""SELECT n.*,COALESCE(m.metadata,'{}'::jsonb) AS metadata
                FROM pm_process_node n LEFT JOIN pm_process_node_metadata m ON m.node_id=n.node_id
                WHERE n.process_id=%s ORDER BY n.node_code,n.node_id""", (_uuid(process_id),))
            result["nodes"] = [_node_record(item) for item in cur.fetchall()]
            cur.execute("SELECT * FROM pm_process_transition WHERE process_id=%s ORDER BY source_node_id,target_node_id,transition_id", (_uuid(process_id),))
            result["transitions"] = [dict(item) for item in cur.fetchall()]
            result["canonical_relations"] = [
                {"node_id": node["node_id"], "node_code": node["node_code"],
                 "process_id": (node.get("properties") or {}).get("canonical_ids", {}).get("proceso_id"),
                 "contract_id": (node.get("properties") or {}).get("canonical_ids", {}).get("contrato_id"),
                 "machine_ids": (node.get("properties") or {}).get("canonical_ids", {}).get("maquina_ids", [])}
                for node in result["nodes"] if node.get("node_type") == "operation"
            ]
            return result

    def create(self, data):
        with db_cursor() as cur:
            # Serialize allocation across concurrent requests.  The
            # application layer also derives the code for non-PostgreSQL
            # adapters, while this transaction is the final source of truth.
            cur.execute("SELECT pg_advisory_xact_lock(hashtext('bpm_process_code_generation'))")
            cur.execute("SELECT process_code FROM bpm_process")
            process_code = next_process_code(cur.fetchall())
            cur.execute("""INSERT INTO bpm_process(process_id,process_code,name,description,abstraction_level,parent_process_id,status)
                VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                (data.get("process_id"), process_code, data["name"], data.get("description"), data.get("abstraction_level", 0), data.get("parent_process_id"), data.get("status", "draft")))
            process = dict(cur.fetchone())
            cur.execute("INSERT INTO proceso(nombre,bpm_process_id) VALUES(%s,%s)", (process["name"], process["process_id"]))
            return process

    def update(self, process_id, data):
        fields = {key: data[key] for key in ("name", "description", "abstraction_level", "parent_process_id", "status") if key in data}
        if not fields:
            return self.get(process_id)
        assignments = ",".join(f"{key}=%s" for key in fields)
        with db_cursor() as cur:
            cur.execute(f"UPDATE bpm_process SET {assignments},updated_at=NOW() WHERE process_id=%s RETURNING *", [*fields.values(), _uuid(process_id)])
            row = cur.fetchone()
            if row and "name" in fields:
                cur.execute("UPDATE proceso SET nombre=%s WHERE bpm_process_id=%s", (row["name"], row["process_id"]))
            return dict(row) if row else None

    def delete(self, process_id, cascade=False):
        with db_cursor() as cur:
            process_uuid = _uuid(process_id)
            if cascade:
                # Remove restrictive dependents first. The surrounding
                # db_cursor transaction makes the cascade all-or-nothing.
                cur.execute("DELETE FROM machine_operation_configuration WHERE process_id=%s", (process_uuid,))
                cur.execute("""DELETE FROM analisis_resultado
                    WHERE causa_id IN (
                        SELECT c.id FROM causa c
                        JOIN contrato ct ON ct.id = c.contrato_id
                        WHERE ct.proceso_id = (SELECT id FROM proceso WHERE bpm_process_id=%s)
                           OR ct.bpm_process_id=%s
                           OR ct.bpm_node_id IN (SELECT node_id FROM pm_process_node WHERE process_id=%s)
                    )
                       OR hipotesis_id IN (
                        SELECT h.id FROM hipotesis h
                        JOIN causa c ON c.id = h.causa_id
                        JOIN contrato ct ON ct.id = c.contrato_id
                        WHERE ct.proceso_id = (SELECT id FROM proceso WHERE bpm_process_id=%s)
                           OR ct.bpm_process_id=%s
                           OR ct.bpm_node_id IN (SELECT node_id FROM pm_process_node WHERE process_id=%s)
                    )""", (process_uuid, process_uuid, process_uuid, process_uuid, process_uuid, process_uuid))
                cur.execute("""DELETE FROM contrato
                    WHERE bpm_process_id=%s
                       OR proceso_id = (SELECT id FROM proceso WHERE bpm_process_id=%s)
                       OR bpm_node_id IN (
                           SELECT node_id FROM pm_process_node WHERE process_id=%s
                       )""", (process_uuid, process_uuid, process_uuid))
            cur.execute("DELETE FROM bpm_process WHERE process_id=%s RETURNING process_id", (process_uuid,))
            return bool(cur.fetchone())


class NodeRepository:
    def insert_operation_on_transition(self, process_id, node, original, first, second):
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_process_node(node_id,process_id,node_code,node_type,name,description,child_process_id,output_role,stock_capacity,stock_initial_quantity,stock_unit,properties)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb) RETURNING *""",
                (node.get("node_id"), _uuid(process_id), node["node_code"], node["node_type"], node["name"], node.get("description"), node.get("child_process_id"), *_node_values(node)))
            created_node = _node_record(cur.fetchone())
            cur.execute("DELETE FROM pm_process_transition WHERE transition_id=%s", (_uuid(original["transition_id"]),))
            created_transitions = []
            for edge in (first, second):
                cur.execute("""INSERT INTO pm_process_transition(transition_id,process_id,source_node_id,target_node_id,transition_type,label,condition,properties)
                    VALUES(%s,%s,%s,%s,%s,%s,%s,%s::jsonb) RETURNING *""", (edge.get("transition_id"), _uuid(process_id), _uuid(edge["source_node_id"]), _uuid(edge["target_node_id"]), edge["transition_type"], edge.get("label"), edge.get("condition"), json.dumps(edge.get("properties") or {})))
                created_transitions.append(dict(cur.fetchone()))
            return {"node": created_node, "transitions": created_transitions}

    def create(self, process_id, data):
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_process_node(node_id,process_id,node_code,node_type,name,description,child_process_id,output_role,stock_capacity,stock_initial_quantity,stock_unit,properties)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb) RETURNING *""",
                (data.get("node_id"), _uuid(process_id), data["node_code"], data["node_type"], data["name"], data.get("description"), data.get("child_process_id"), *_node_values(data)))
            return _node_record(cur.fetchone())

    def create_with_transition(self, process_id, node, transition):
        """Persist the node and incoming transition in one transaction."""
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_process_node(node_id,process_id,node_code,node_type,name,description,child_process_id,output_role,stock_capacity,stock_initial_quantity,stock_unit,properties)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb) RETURNING *""",
                (node.get("node_id"), _uuid(process_id), node["node_code"], node["node_type"], node["name"], node.get("description"), node.get("child_process_id"), *_node_values(node)))
            created_node = _node_record(cur.fetchone())
            cur.execute("""INSERT INTO pm_process_transition(transition_id,process_id,source_node_id,target_node_id,transition_type,label,condition,properties)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s::jsonb) RETURNING *""",
                (transition.get("transition_id"), _uuid(process_id), _uuid(transition["source_node_id"]), created_node["node_id"], transition["transition_type"], transition.get("label"), transition.get("condition"), json.dumps(transition.get("properties") or {})))
            return {"node": created_node, "transition": dict(cur.fetchone())}

    def get(self, node_id):
        with db_cursor() as cur:
            cur.execute("SELECT n.*,COALESCE(m.metadata,'{}'::jsonb) AS metadata FROM pm_process_node n LEFT JOIN pm_process_node_metadata m ON m.node_id=n.node_id WHERE n.node_id=%s", (_uuid(node_id),))
            row = cur.fetchone()
            return _node_record(row) if row else None

    def update(self, node_id, data):
        fields = {key: data[key] for key in ("node_code","node_type","name","description","child_process_id","output_role","properties") if key in data}
        if "properties" in fields:
            props = dict(fields["properties"] or {})
            stock = props.get("stock") if fields.get("node_type", data.get("node_type")) == "stock" else None
            fields.update({"stock_capacity": stock.get("capacity") if stock else None, "stock_initial_quantity": stock.get("initial_quantity") if stock else None, "stock_unit": stock.get("unit") if stock else None})
        if not fields:
            return self.get(node_id)
        assignments = ",".join(f"{key}=%s{'::jsonb' if key=='properties' else ''}" for key in fields)
        values = [json.dumps(value) if key == "properties" else value for key, value in fields.items()]
        with db_cursor() as cur:
            cur.execute(f"UPDATE pm_process_node SET {assignments},updated_at=NOW() WHERE node_id=%s RETURNING *", [*values, _uuid(node_id)])
            row = cur.fetchone()
            return _node_record(row) if row else None

    def update_stages(self, node_id, stages):
        with db_cursor() as cur:
            cur.execute("UPDATE pm_process_node SET properties=jsonb_set(COALESCE(properties,'{}'::jsonb),'{etapas}',%s::jsonb,true),updated_at=NOW() WHERE node_id=%s RETURNING *", (json.dumps(canonical_stages(stages, envelope=True)), _uuid(node_id)))
            row = cur.fetchone()
            return _node_record(row) if row else None

    def delete(self, node_id):
        with db_cursor() as cur:
            cur.execute("DELETE FROM pm_process_node WHERE node_id=%s RETURNING node_id", (_uuid(node_id),))
            return bool(cur.fetchone())

    def delete_with_reconnect(self, node_id, reconnect_edges):
        with db_cursor() as cur:
            cur.execute("DELETE FROM pm_process_node WHERE node_id=%s RETURNING node_id", (_uuid(node_id),))
            deleted = cur.fetchone()
            if not deleted:
                return {"deleted": False, "node_id": str(node_id), "reconnected": []}
            for edge in reconnect_edges:
                cur.execute("""INSERT INTO pm_process_transition(transition_id,process_id,source_node_id,target_node_id,transition_type,label,condition,properties)
                    SELECT %s, process_id, %s, %s, %s, %s, %s, %s::jsonb
                    FROM pm_process_node WHERE node_id=%s
                    RETURNING *""", (edge.get("transition_id"), _uuid(edge["source_node_id"]), _uuid(edge["target_node_id"]), edge["transition_type"], edge.get("label"), edge.get("condition"), json.dumps(edge.get("properties") or {}), _uuid(edge["source_node_id"])))
            return {"deleted": True, "node_id": str(node_id), "reconnected": reconnect_edges}

    def get_metadata(self, node_id):
        with db_cursor() as cur:
            cur.execute("SELECT metadata FROM pm_process_node_metadata WHERE node_id=%s", (_uuid(node_id),))
            row = cur.fetchone()
            return dict(row["metadata"] or {}) if row else {}

    def upsert_metadata(self, node_id, metadata):
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_process_node_metadata(node_id,metadata) VALUES(%s,%s::jsonb)
                ON CONFLICT(node_id) DO UPDATE SET metadata=EXCLUDED.metadata,updated_at=NOW() RETURNING metadata,updated_at""", (_uuid(node_id), json.dumps(metadata)))
            row = cur.fetchone()
            return {"metadata": dict(row["metadata"] or {}), "updated_at": row["updated_at"]}

    def list_context_records(self, node_id=None, process_id=None, record_type=None):
        clauses, values = [], []
        if node_id: clauses.append("node_id=%s"); values.append(_uuid(node_id))
        if process_id: clauses.append("process_id=%s"); values.append(_uuid(process_id))
        if record_type: clauses.append("record_type=%s"); values.append(record_type)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with db_cursor() as cur:
            cur.execute(f"SELECT * FROM pm_context_record {where} ORDER BY created_at,record_id", values)
            return [dict(row) for row in cur.fetchall()]

    def create_context_record(self, node_id, process_id, record):
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_context_record(node_id,process_id,record_type,payload,source,provenance,execution_id,supports)
                VALUES(%s,%s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s,%s::jsonb) RETURNING *""", (node_id,process_id,record["record_type"],json.dumps(record["payload"]),json.dumps(record["source"]),json.dumps(record["provenance"]),record.get("execution_id"),json.dumps(record.get("supports")) if record.get("supports") is not None else None))
            return dict(cur.fetchone())


class TransitionRepository:
    def create(self, process_id, data):
        with db_cursor() as cur:
            cur.execute("""INSERT INTO pm_process_transition(transition_id,process_id,source_node_id,target_node_id,transition_type,label,condition,properties)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s::jsonb) RETURNING *""", (data.get("transition_id"),_uuid(process_id),_uuid(data["source_node_id"]),_uuid(data["target_node_id"]),data["transition_type"],data.get("label"),data.get("condition"),json.dumps(data.get("properties") or {})))
            return dict(cur.fetchone())

    def get(self, transition_id):
        with db_cursor() as cur:
            cur.execute("SELECT * FROM pm_process_transition WHERE transition_id=%s", (_uuid(transition_id),))
            row = cur.fetchone()
            return dict(row) if row else None

    def update(self, transition_id, data):
        fields = {key: data[key] for key in (
            "source_node_id", "target_node_id", "transition_type", "label", "condition", "properties"
        ) if key in data}
        if not fields:
            return self.get(transition_id)
        assignments = ",".join(f"{key}=%s{'::jsonb' if key == 'properties' else ''}" for key in fields)
        values = []
        for key, value in fields.items():
            if key in {"source_node_id", "target_node_id"}:
                values.append(_uuid(value))
            elif key == "properties":
                values.append(json.dumps(value or {}))
            else:
                values.append(value)
        with db_cursor() as cur:
            cur.execute(
                f"UPDATE pm_process_transition SET {assignments} WHERE transition_id=%s RETURNING *",
                [*values, _uuid(transition_id)],
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def delete(self, transition_id):
        with db_cursor() as cur:
            cur.execute("DELETE FROM pm_process_transition WHERE transition_id=%s RETURNING transition_id", (_uuid(transition_id),))
            return bool(cur.fetchone())
