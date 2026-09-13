from ..adapters.outbound.analysis_postgres import RcaTreeAnalysisPostgresAdapter
from ..adapters.outbound.transaction_postgres import PostgresTransactionAdapter
from ..application.use_cases import (
    CreateAnalysis,
    GetAnalysis,
    ListAnalyses,
    ListAnalysisTemplates,
    SaveAnalysisResult,
    UpdateAnalysis,
)
from .analysis_application import RcaTreeAnalysisApplication


def build_rca_tree_analysis_persistence():
    return ScientificAnalysisPersistence(RcaTreeAnalysisPostgresAdapter(PostgresTransactionAdapter()))


class ScientificAnalysisPersistence:
    """Keep scientific-column mapping at the RCA infrastructure boundary."""

    def __init__(self, delegate):
        self._delegate = delegate
        self.transaction = delegate.transaction

    def save(self, analysis_id, payload):
        kind = payload["element_type"]
        cause_id = payload.get("cause_id") if kind == "causa" else None
        hypothesis_id = payload.get("hypothesis_id") if kind == "hipotesis" else None
        if cause_id is None and hypothesis_id is None:
            raise ValueError("Falta la identidad del resultado.")
        values = (
            analysis_id, kind, cause_id, hypothesis_id,
            payload.get("evidence", payload.get("evidencia")), payload.get("conclusion"),
            payload.get("evaluation") or "pendiente", payload.get("decision"),
            payload.get("decision_justification", payload.get("justificacion_decision")),
            payload.get("control_action", payload.get("accion_control")),
            payload.get("action_owner", payload.get("responsable_accion", payload.get("responsable"))),
            payload.get("control_date", payload.get("fecha_control")),
        )
        with self.transaction.cursor() as cur:
            cur.execute("SELECT estado FROM analisis_causas WHERE id=%s", (analysis_id,))
            analysis = cur.fetchone()
            if not analysis:
                raise ValueError("Analisis no encontrado.")
            if analysis["estado"] == "cerrado":
                raise ValueError("El análisis cerrado es de solo lectura; reábrelo para editarlo.")
            if kind == "hipotesis":
                cur.execute(
                    """SELECT h.id FROM hipotesis h JOIN causa c ON c.id=h.causa_id
                       WHERE h.id=%s AND c.contrato_id=(SELECT contrato_id FROM analisis_causas WHERE id=%s)""",
                    (hypothesis_id, analysis_id),
                )
                if not cur.fetchone():
                    raise ValueError("La hipótesis no existe o no pertenece al contrato del análisis.")
                criterion = payload.get("validation_criterion", payload.get("criterio_validacion"))
                if criterion is not None:
                    cur.execute("UPDATE hipotesis SET criterio_validacion=%s WHERE id=%s", (str(criterion).strip(), hypothesis_id))
            cur.execute("""INSERT INTO analisis_resultado(
                analisis_id,tipo_elemento,causa_id,hipotesis_id,evidencia,conclusion,
                evaluacion,decision,justificacion_decision,accion_control,
                responsable_accion,fecha_control)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (analisis_id,tipo_elemento,causa_id,hipotesis_id)
                DO UPDATE SET evidencia=EXCLUDED.evidencia, conclusion=EXCLUDED.conclusion,
                    evaluacion=EXCLUDED.evaluacion, decision=EXCLUDED.decision,
                    justificacion_decision=EXCLUDED.justificacion_decision,
                    accion_control=EXCLUDED.accion_control,
                    responsable_accion=EXCLUDED.responsable_accion,
                    fecha_control=EXCLUDED.fecha_control, fecha=NOW()
                RETURNING *""", values)
            return dict(cur.fetchone())

    def __getattr__(self, name):
        return getattr(self._delegate, name)


def build_rca_tree_analysis_application(*, persistence=None):
    persistence = persistence or build_rca_tree_analysis_persistence()
    participants = ParticipantAdapter(persistence)
    results = ResultAdapter(persistence)
    get_analysis = GetAnalysis(persistence, participants, results)
    return RcaTreeAnalysisApplication(
        list_analyses=ListAnalyses(persistence),
        list_templates=ListAnalysisTemplates(persistence),
        create_analysis=CreateAnalysis(persistence, participants),
        get_analysis=get_analysis,
        update_analysis=UpdateAnalysis(persistence, get_analysis),
        save_result=SaveAnalysisResult(results),
    )


class ParticipantAdapter:
    def __init__(self, persistence): self.persistence = persistence
    def list_for_analysis(self, analysis_id):
        loader = getattr(self.persistence, "list_participants", None) or getattr(self.persistence, "list_for_analysis")
        return loader(analysis_id)
    def add(self, analysis_id, participant): return self.persistence.add(analysis_id, participant)


class ResultAdapter:
    def __init__(self, persistence): self.persistence = persistence
    def get(self, analysis_id): return self.persistence.get(analysis_id)
    def list_for_analysis(self, analysis_id): return self.persistence.list_results(analysis_id)
    def save(self, analysis_id, payload): return self.persistence.save(analysis_id, payload)
