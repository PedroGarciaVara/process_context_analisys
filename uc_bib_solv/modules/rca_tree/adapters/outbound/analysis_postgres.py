"""PostgreSQL adapter for RCA_TREE analysis ports."""

from __future__ import annotations

class RcaTreeAnalysisPostgresAdapter:
    """Own the SQL/row mapping boundary for causal analyses."""

    def __init__(self, transaction):
        self.transaction = transaction

    def list_templates(self, process_id=None):
        with self.transaction.cursor() as cur:
            where, params = ("WHERE c.proceso_id = %s", [int(process_id)]) if process_id else ("", [])
            cur.execute(f"""SELECT c.id, c.proceso_id, c.nombre, c.kpi_description, c.kpi_args, c.kpi_function, c.objetivo,
                COUNT(DISTINCT ca.id) AS causa_count, COUNT(DISTINCT h.id) AS hypothesis_count
                FROM contrato c LEFT JOIN causa ca ON ca.contrato_id = c.id
                LEFT JOIN hipotesis h ON h.causa_id = ca.id {where}
                GROUP BY c.id HAVING COUNT(DISTINCT ca.id) > 0 ORDER BY c.nombre""", params)
            return [dict(row) for row in cur.fetchall()]

    def list_recent(self, limit=20, status=None, search=None):
        with self.transaction.cursor() as cur:
            filters, params = [], []
            if status in {"abierto", "cerrado"}:
                filters.append("a.estado=%s"); params.append(status)
            if search:
                filters.append("(CAST(a.id AS TEXT) ILIKE %s OR c.nombre ILIKE %s OR p.nombre ILIKE %s OR a.indicio_apertura ILIKE %s)")
                term = f"%{search.strip()}%"; params.extend([term] * 4)
            where = f"WHERE {' AND '.join(filters)}" if filters else ""
            params.append(max(1, min(int(limit), 100)))
            cur.execute(f"""SELECT a.id, a.contrato_id, a.proceso_id, a.maquina_id, a.persona_inicializacion,
                a.descripcion_apertura, a.estado, a.fecha_inicializacion, a.fecha_apertura, a.fecha_cierre,
                a.indicio_apertura, a.conclusion_final, c.nombre AS contrato_nombre, p.nombre AS proceso_nombre,
                COUNT(ar.id) AS resultado_count FROM analisis_causas a LEFT JOIN contrato c ON c.id=a.contrato_id
                LEFT JOIN proceso p ON p.id=a.proceso_id LEFT JOIN analisis_resultado ar ON ar.analisis_id=a.id
                {where} GROUP BY a.id, c.nombre, p.nombre ORDER BY a.fecha_inicializacion DESC, a.id DESC LIMIT %s""", params)
            return [dict(row) for row in cur.fetchall()]

    def create(self, payload):
        contract_id = int(payload["contract_id"]); process_id = payload.get("process_id")
        if process_id is None:
            with self.transaction.cursor() as cur:
                cur.execute("SELECT proceso_id FROM contrato WHERE id=%s", (contract_id,)); row = cur.fetchone()
                process_id = row["proceso_id"] if row else None
        if process_id is None:
            raise ValueError("Debe seleccionar un proceso.")
        participants = payload.get("participants") or ["Usuario"]
        indication = str(payload["indication"]).strip()
        with self.transaction.cursor() as cur:
            cur.execute("""INSERT INTO analisis_causas(contrato_id, proceso_id, maquina_id, persona_inicializacion,
                descripcion_apertura, fecha_apertura, indicio_apertura) VALUES (%s,%s,%s,%s,%s,COALESCE(%s::date,CURRENT_DATE),%s)
                RETURNING id, contrato_id, proceso_id, maquina_id, persona_inicializacion, descripcion_apertura, estado,
                fecha_inicializacion, fecha_apertura, indicio_apertura, conclusion_final""",
                (contract_id, process_id, payload.get("machine_id"), participants[0], indication, payload.get("opening_date"), indication))
            return dict(cur.fetchone())

    def add(self, analysis_id, participant):
        with self.transaction.cursor() as cur:
            cur.execute("INSERT INTO analisis_participante(analisis_id, participante) VALUES (%s,%s) ON CONFLICT DO NOTHING RETURNING analisis_id, participante", (analysis_id, participant))
            row = cur.fetchone()
            return dict(row) if row else {"analisis_id": analysis_id, "participante": participant}

    def list_participants(self, analysis_id):
        with self.transaction.cursor() as cur:
            cur.execute("SELECT participante FROM analisis_participante WHERE analisis_id=%s ORDER BY participante", (analysis_id,))
            return [row["participante"] for row in cur.fetchall()]

    def get(self, analysis_id):
        with self.transaction.cursor() as cur:
            cur.execute("SELECT * FROM analisis_causas WHERE id=%s", (analysis_id,)); row = cur.fetchone()
            if not row:
                return None
            result = dict(row)
            cur.execute("""SELECT DISTINCT causa_id, hipotesis_id FROM analisis_resultado
                WHERE analisis_id=%s AND (causa_id IS NOT NULL OR hipotesis_id IS NOT NULL)""", (analysis_id,))
            historical = [dict(item) for item in cur.fetchall()]
            cur.execute("""SELECT ca.id AS causa_id, h.id AS hipotesis_id
                FROM causa ca LEFT JOIN hipotesis h ON h.causa_id=ca.id
                WHERE ca.contrato_id=%s""", (result["contrato_id"],))
            current = [dict(item) for item in cur.fetchall()]
            current_ids = {int(x) for item in current for x in (item.get("causa_id"), item.get("hipotesis_id")) if x is not None}
            historical_ids = {int(x) for item in historical for x in (item.get("causa_id"), item.get("hipotesis_id")) if x is not None}
            result["template_comparison"] = {
                "current_ids": sorted(current_ids),
                "historical_ids": sorted(historical_ids),
                "new_ids": sorted(current_ids - historical_ids),
                "missing_ids": sorted(historical_ids - current_ids),
                "missing_message": f"{len(historical_ids - current_ids)} causas/hipótesis no encontradas en la plantilla actual",
            }
            return result

    def update(self, analysis_id, payload):
        fields, values = [], []
        with self.transaction.cursor() as cur:
            cur.execute("SELECT estado FROM analisis_causas WHERE id=%s", (analysis_id,))
            current = cur.fetchone()
        if not current:
            raise ValueError("Analisis no encontrado.")
        requested_status = payload.get("status")
        content_changes = any(key != "status" for key in payload)
        if current["estado"] == "cerrado" and content_changes and requested_status != "abierto":
            raise ValueError("El análisis cerrado es de solo lectura; reábrelo para editarlo.")
        if payload.get("status") is not None:
            if payload["status"] not in {"abierto", "cerrado"}: raise ValueError("status debe ser abierto o cerrado.")
            fields += ["estado=%s", "fecha_cierre=CASE WHEN %s='cerrado' THEN NOW() ELSE NULL END"]; values += [payload["status"], payload["status"]]
        if payload.get("conclusion") is not None: fields.append("conclusion_final=%s"); values.append(str(payload["conclusion"]).strip())
        if "opening_date" in payload: fields.append("fecha_apertura=%s"); values.append(payload["opening_date"] or None)
        if payload.get("indication") is not None: fields += ["indicio_apertura=%s", "descripcion_apertura=%s"]; values += [str(payload["indication"]).strip()] * 2
        if not fields: raise ValueError("No hay cambios para guardar.")
        with self.transaction.cursor() as cur:
            values.append(int(analysis_id)); cur.execute(f"UPDATE analisis_causas SET {', '.join(fields)} WHERE id=%s RETURNING *", values)
            row = cur.fetchone()
            if not row: raise ValueError("Analisis no encontrado.")
            return dict(row)

    def save(self, analysis_id, payload):
        kind = payload["element_type"]
        cause_id = payload.get("cause_id") if kind == "causa" else None
        hypothesis_id = payload.get("hypothesis_id") if kind == "hipotesis" else None
        if cause_id is None and hypothesis_id is None: raise ValueError("Falta la identidad del resultado.")
        with self.transaction.cursor() as cur:
            cur.execute("SELECT estado FROM analisis_causas WHERE id=%s", (analysis_id,))
            analysis = cur.fetchone()
            if not analysis: raise ValueError("Analisis no encontrado.")
            if analysis["estado"] == "cerrado":
                raise ValueError("El análisis cerrado es de solo lectura; reábrelo para editarlo.")
            cur.execute("""INSERT INTO analisis_resultado(analisis_id,tipo_elemento,causa_id,hipotesis_id,evidencia,conclusion,evaluacion)
                VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (analisis_id,tipo_elemento,causa_id,hipotesis_id)
                DO UPDATE SET evidencia=EXCLUDED.evidencia, conclusion=EXCLUDED.conclusion, evaluacion=EXCLUDED.evaluacion, fecha=NOW()
                RETURNING id,analisis_id,tipo_elemento,causa_id,hipotesis_id,evidencia,conclusion,evaluacion,fecha""",
                (analysis_id, kind, cause_id, hypothesis_id, payload.get("evidence"), payload.get("conclusion"), payload.get("evaluation") or "pendiente"))
            return dict(cur.fetchone())

    def list_results(self, analysis_id):
        with self.transaction.cursor() as cur:
            cur.execute("SELECT * FROM analisis_resultado WHERE analisis_id=%s ORDER BY id", (analysis_id,))
            return [dict(row) for row in cur.fetchall()]

    def upsert_detail(self, analysis_id, result_type, evaluation, comment=None, cause_id=None, hypothesis_id=None, node_id=None):
        with self.transaction.cursor() as cur:
            cur.execute("""SELECT id FROM analisis_causas_detalle WHERE analisis_causa_id=%s AND tipo_elemento=%s
                AND causa_id IS NOT DISTINCT FROM %s AND hipotesis_id IS NOT DISTINCT FROM %s""", (analysis_id, result_type, cause_id, hypothesis_id))
            existing = cur.fetchone()
            if existing:
                cur.execute("""UPDATE analisis_causas_detalle SET evaluacion=%s, comentario=%s, fecha=NOW(), node_id=%s
                    WHERE id=%s RETURNING id, analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha""", (evaluation, comment, node_id, existing["id"]))
            else:
                cur.execute("""INSERT INTO analisis_causas_detalle(analisis_causa_id,tipo_elemento,causa_id,hipotesis_id,node_id,evaluacion,comentario,fecha)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,NOW()) RETURNING id, analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha""", (analysis_id, result_type, cause_id, hypothesis_id, node_id, evaluation, comment))
            return dict(cur.fetchone())

    def list_details(self, analysis_id):
        with self.transaction.cursor() as cur:
            cur.execute("SELECT id, analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha FROM analisis_causas_detalle WHERE analisis_causa_id=%s ORDER BY fecha DESC, id DESC", (analysis_id,))
            return [dict(row) for row in cur.fetchall()]

    def get_detail(self, analysis_id, result_type, element_id):
        with self.transaction.cursor() as cur:
            column = "causa_id" if result_type == "causa" else "hipotesis_id"
            cur.execute(f"SELECT id, analisis_causa_id, tipo_elemento, causa_id, hipotesis_id, node_id, evaluacion, comentario, fecha FROM analisis_causas_detalle WHERE analisis_causa_id=%s AND tipo_elemento=%s AND {column}=%s", (analysis_id, result_type, element_id))
            row = cur.fetchone()
            return dict(row) if row else None

    def list_by_contract(self, contract_id, status=None):
        return [item for item in self.list_recent(100, status) if item.get("contrato_id") == int(contract_id)]

    def get_open_by_contract(self, contract_id):
        items = self.list_by_contract(contract_id, "abierto")
        return items[0] if items else None

    def update_status(self, analysis_id, status): return self.update(analysis_id, {"status": status})
    def list_summary(self): return self.list_recent(100)


__all__ = ["RcaTreeAnalysisPostgresAdapter"]
