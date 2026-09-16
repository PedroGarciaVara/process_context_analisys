import pytest

from uc_bib_solv.modules.rca_tree.application.use_cases.hypotheses.create_hypothesis import CreateHypothesis
from uc_bib_solv.modules.rca_tree.application.use_cases.hypotheses.update_hypothesis import UpdateHypothesis
from uc_bib_solv.modules.rca_tree.application.use_cases.analyses.save_analysis_result import SaveAnalysisResult
from uc_bib_solv.modules.rca_tree.domain.analyses.entities import AnalysisResult, Hypothesis, validate_scientific_decision
from uc_bib_solv.modules.rca_tree.domain.exceptions import CausalTreeStateError, CausalTreeValidationError
from uc_bib_solv.modules.rca_tree.infrastructure.analysis_wiring import build_rca_tree_analysis_application


class HypothesisRepo:
    def __init__(self): self.created = self.updated = None
    def create(self, *args, **kwargs): self.created = (args, kwargs); return {"id": 1, **kwargs}
    def update(self, *args, **kwargs): self.updated = (args, kwargs); return {"id": args[0], **kwargs}


class ResultRepo:
    def __init__(self, state="abierto"): self.state = state; self.saved = None
    def get(self, _): return {"estado": self.state}
    def save(self, analysis_id, payload): self.saved = (analysis_id, payload); return {"id": 5, **payload}


@pytest.mark.parametrize("status", ["confirmada", "rechazada", "descartada"])
def test_final_decision_requires_evidence_and_criterion(status):
    with pytest.raises(CausalTreeValidationError):
        Hypothesis(1, 1207, "TEST hipótesis", validation_criterion="", status=status, evidence="")
    validate_scientific_decision(status, evidence="observación", criterion="criterio", justification="motivo")


def test_rejected_decision_requires_evidence_and_criterion_and_inconclusive_requires_one():
    validate_scientific_decision("rechazada", evidence="obs", criterion="crit")
    with pytest.raises(CausalTreeValidationError):
        validate_scientific_decision("inconclusa", justification="")


def test_legacy_hypothesis_payload_still_saves_and_new_fields_are_forwarded():
    repo = HypothesisRepo()
    CreateHypothesis(repo).execute({"cause_id": 1207, "descripcion": "legacy", "criterio_validacion": "KPI"})
    assert repo.created[0][:2] == (1207, "legacy")
    assert repo.created[1]["prediction"] is None if "prediction" in repo.created[1] else True
    UpdateHypothesis(repo).execute({
        "hypothesis_id": 1, "descripcion": "full", "estado": "confirmada", "criterio_validacion": "KPI",
        "prediccion": "baja", "metrica": "ppm", "unidad": "%", "fuente_datos": "PG",
        "metodo": "comparación", "periodo": "Q3", "calculo": "media", "umbral": "<5",
        "evidencia": "serie TEST", "decision": "confirmada", "accion_control": "ajustar",
    })
    assert repo.updated[1]["prediction"] == "baja"
    assert repo.updated[1]["data_source"] == "PG"
    assert repo.updated[1]["control_action"] == "ajustar"


def test_template_update_uses_partial_legacy_fields_and_never_sends_none_decision():
    repo = HypothesisRepo()
    UpdateHypothesis(repo).execute({
        "hypothesis_id": 7,
        "nombre": "Título conservado",
        "descripcion": "Descripción editable",
        "criterio_validacion": "Criterio",
        "metodo": "Método de cálculo",
    })
    # None is the explicit partial-update sentinel for lifecycle/type fields;
    # a repository must preserve its current values instead of defaulting them.
    assert repo.updated[0][2:5] == (None, "Criterio", None)
    assert "decision" not in repo.updated[1]
    assert repo.updated[1]["method"] == "Método de cálculo"


def test_analysis_result_legacy_and_scientific_fields_preserve_identity():
    repo = ResultRepo()
    result = SaveAnalysisResult(repo).execute(9, {"element_type": "hipotesis", "hypothesis_id": 3007, "evidence": "legacy evidence"})
    assert result["id"] == 5
    assert repo.saved[1]["hypothesis_id"] == 3007
    assert repo.saved[1]["evidence"] == "legacy evidence"
    full = SaveAnalysisResult(repo).execute(9, {
        "element_type": "hipotesis", "hypothesis_id": 3007, "evaluation": "confirmada",
        "evidence": "TEST series", "validation_criterion": "<5%", "prediction": "baja",
        "metric": "ppm", "unit": "%", "data_source": "PG", "method": "media",
        "period": "Q3", "calculation": "mean", "threshold": "5", "decision": "confirmada",
        "control_action": "ajustar", "action_owner": "QA", "control_date": "2026-09-11",
    })
    assert full["prediction"] == "baja"
    assert full["decision"] == "confirmada"


def test_rejected_analysis_result_forwards_decision_justification():
    repo = ResultRepo()
    SaveAnalysisResult(repo).execute(9, {
        "element_type": "hipotesis", "hypothesis_id": 3007, "evaluation": "descartada",
        "evidence": "TEST evidencia", "validation_criterion": "TEST criterio",
        "decision_justification": "TEST motivo de rechazo",
    })
    assert repo.saved[1]["decision_justification"] == "TEST motivo de rechazo"


def test_closed_analysis_blocks_result_and_reopening_allows_it():
    repo = ResultRepo("cerrado")
    with pytest.raises(CausalTreeStateError):
        SaveAnalysisResult(repo).execute(9, {
            "element_type": "hipotesis", "hypothesis_id": 3007, "evaluation": "descartada",
            "evidence": "TEST evidencia cerrada", "validation_criterion": "TEST criterio cerrado",
            "decision_justification": "TEST motivo cerrado",
        })
    repo.state = "abierto"
    SaveAnalysisResult(repo).execute(9, {
        "element_type": "hipotesis", "hypothesis_id": 3007, "evaluation": "descartada",
        "evidence": "TEST evidencia abierta", "validation_criterion": "TEST criterio abierto",
        "decision_justification": "TEST motivo abierto",
    })
    assert repo.saved is not None


class AnalysisPersistence:
    def __init__(self): self.saved = None; self.updated = None
    def list_recent(self, *args): return []
    def list_templates(self, *_): return []
    def create(self, payload): return {"id": 9, "estado": "abierto", **payload}
    def add(self, *_): return {}
    def list_for_analysis(self, *_): return []
    def get(self, _): return {"id": 9, "estado": "abierto"}
    def update(self, analysis_id, payload): self.updated = (analysis_id, payload); return {"id": analysis_id, **payload}
    def save(self, analysis_id, payload): self.saved = (analysis_id, payload); return {"id": 5, **payload}
    def list_results(self, *_): return []


def test_reopen_is_explicit_transition_and_not_an_implicit_result_write():
    persistence = AnalysisPersistence()
    app = build_rca_tree_analysis_application(persistence=persistence)
    assert app.update(9, {"status": "abierto"})["status"] == "abierto"
    assert persistence.updated == (9, {"status": "abierto"})
