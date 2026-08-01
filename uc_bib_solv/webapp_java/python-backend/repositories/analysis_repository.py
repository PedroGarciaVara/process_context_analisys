from __future__ import annotations

from app.persistence.db import db_cursor


def list_templates(process_id: int | None = None) -> list[dict]:
    with db_cursor() as cur:
        params = []
        where = ""
        if process_id:
            where = "WHERE c.proceso_id = %s"
            params.append(int(process_id))
        cur.execute(
            f"""
            SELECT c.id, c.proceso_id, c.nombre, c.metrica, c.objetivo,
                   COUNT(DISTINCT ca.id) AS causa_count,
                   COUNT(DISTINCT h.id) AS hypothesis_count
            FROM contrato c
            LEFT JOIN causa ca ON ca.contrato_id = c.id
            LEFT JOIN hipotesis h ON h.causa_id = ca.id
            {where}
            GROUP BY c.id
            HAVING COUNT(DISTINCT ca.id) > 0
            ORDER BY c.nombre
            """,
            params,
        )
        return [dict(row) for row in cur.fetchall()]


def list_recent(limit: int = 20, status: str | None = None, search: str | None = None) -> list[dict]:
    with db_cursor() as cur:
        filters = []
        params = []
        if status in {"abierto", "cerrado"}:
            filters.append("a.estado=%s")
            params.append(status)
        if search:
            filters.append("(CAST(a.id AS TEXT) ILIKE %s OR c.nombre ILIKE %s OR p.nombre ILIKE %s OR a.indicio_apertura ILIKE %s)")
            term = f"%{search.strip()}%"
            params.extend([term, term, term, term])
        where = f"WHERE {' AND '.join(filters)}" if filters else ""
        params.append(max(1, min(int(limit), 100)))
        cur.execute(
            f"""
            SELECT a.id, a.contrato_id, a.proceso_id, a.maquina_id,
                   a.persona_inicializacion, a.descripcion_apertura, a.estado,
                   a.fecha_inicializacion, a.fecha_apertura, a.fecha_cierre,
                   a.indicio_apertura, a.conclusion_final,
                   c.nombre AS contrato_nombre, p.nombre AS proceso_nombre,
                   COUNT(ar.id) AS resultado_count
            FROM analisis_causas a
            LEFT JOIN contrato c ON c.id = a.contrato_id
            LEFT JOIN proceso p ON p.id = a.proceso_id
            LEFT JOIN analisis_resultado ar ON ar.analisis_id = a.id
            {where}
            GROUP BY a.id, c.nombre, p.nombre
            ORDER BY a.fecha_inicializacion DESC, a.id DESC
            LIMIT %s
            """,
            params,
        )
        return [dict(row) for row in cur.fetchall()]


def create_analysis(payload: dict) -> dict:
    template_contract_id = payload.get("template_contract_id") or payload.get("contract_id")
    if template_contract_id is None:
        raise ValueError("Debe seleccionar una plantilla de causas.")
    contract_id = int(template_contract_id)
    process_id = payload.get("process_id")
    if process_id is None:
        with db_cursor() as cur:
            cur.execute("SELECT proceso_id FROM contrato WHERE id=%s", (contract_id,))
            row = cur.fetchone()
            process_id = row["proceso_id"] if row else None
    if process_id is None:
        raise ValueError("Debe seleccionar un proceso.")
    machine_id = payload.get("machine_id")
    participants = [str(value).strip() for value in payload.get("participants", []) if str(value).strip()]
    participants = participants or [str(payload.get("participant") or "Usuario").strip()]
    if not participants:
        raise ValueError("Debe indicar al menos un participante.")
    indication = str(payload.get("indication") or payload.get("description") or "").strip()
    if not indication:
        raise ValueError("El indicio de apertura es obligatorio.")
    opening_date = payload.get("opening_date") or None
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO analisis_causas(
                contrato_id, proceso_id, maquina_id, persona_inicializacion,
                descripcion_apertura, fecha_apertura, indicio_apertura
            ) VALUES (%s, %s, %s, %s, %s, COALESCE(%s::date, CURRENT_DATE), %s)
            RETURNING id, contrato_id, proceso_id, maquina_id,
                      persona_inicializacion, descripcion_apertura, estado,
                      fecha_inicializacion, fecha_apertura, indicio_apertura,
                      conclusion_final
            """,
            (contract_id, process_id, machine_id, participants[0], indication, opening_date, indication),
        )
        analysis = dict(cur.fetchone())
        for participant in participants:
            cur.execute(
                "INSERT INTO analisis_participante(analisis_id, participante) VALUES (%s, %s)",
                (analysis["id"], participant),
            )
        analysis["participants"] = participants
        return analysis


def update_analysis(analysis_id: int, payload: dict) -> dict:
    state = payload.get("status")
    conclusion = payload.get("conclusion")
    opening_date = payload.get("opening_date")
    indication = payload.get("indication")
    fields = []
    values = []
    if state is not None:
        if state not in {"abierto", "cerrado"}:
            raise ValueError("status debe ser abierto o cerrado.")
        fields.append("estado=%s")
        values.append(state)
        fields.append("fecha_cierre=CASE WHEN %s='cerrado' THEN NOW() ELSE NULL END")
        values.append(state)
    if conclusion is not None:
        fields.append("conclusion_final=%s")
        values.append(str(conclusion).strip())
    if opening_date is not None:
        fields.append("fecha_apertura=%s")
        values.append(opening_date or None)
    if indication is not None:
        fields.extend(["indicio_apertura=%s", "descripcion_apertura=%s"])
        values.extend([str(indication).strip(), str(indication).strip()])
    if not fields:
        raise ValueError("No hay cambios para guardar.")
    with db_cursor() as cur:
        values.append(int(analysis_id))
        cur.execute(
            f"UPDATE analisis_causas SET {', '.join(fields)} WHERE id=%s RETURNING *",
            values,
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Analisis no encontrado.")
        return dict(row)


def save_result(analysis_id: int, payload: dict) -> dict:
    kind = str(payload.get("element_type") or "").strip().lower()
    if kind not in {"causa", "hipotesis"}:
        raise ValueError("element_type debe ser causa o hipotesis.")
    cause_id = payload.get("cause_id") if kind == "causa" else None
    hypothesis_id = payload.get("hypothesis_id") if kind == "hipotesis" else None
    if cause_id is None and hypothesis_id is None:
        raise ValueError("Falta la identidad del resultado.")
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO analisis_resultado(
                analisis_id, tipo_elemento, causa_id, hipotesis_id,
                evidencia, conclusion, evaluacion
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (analisis_id, tipo_elemento, causa_id, hipotesis_id)
            DO UPDATE SET evidencia=EXCLUDED.evidencia,
                          conclusion=EXCLUDED.conclusion,
                          evaluacion=EXCLUDED.evaluacion,
                          fecha=NOW()
            RETURNING id, analisis_id, tipo_elemento, causa_id, hipotesis_id,
                      evidencia, conclusion, evaluacion, fecha
            """,
            (
                analysis_id,
                kind,
                cause_id,
                hypothesis_id,
                payload.get("evidence"),
                payload.get("conclusion"),
                payload.get("evaluation") or "pendiente",
            ),
        )
        return dict(cur.fetchone())


def get_analysis(analysis_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM analisis_causas WHERE id=%s",
            (analysis_id,),
        )
        analysis = cur.fetchone()
        if not analysis:
            return None
        cur.execute("SELECT participante FROM analisis_participante WHERE analisis_id=%s ORDER BY participante", (analysis_id,))
        participants = [row["participante"] for row in cur.fetchall()]
        cur.execute("SELECT * FROM analisis_resultado WHERE analisis_id=%s ORDER BY id", (analysis_id,))
        results = [dict(row) for row in cur.fetchall()]
        return {**dict(analysis), "participants": participants, "results": results}
