from uuid import uuid4

from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessNode, ProcessTransition
from uc_bib_solv.modules.bpm.domain.processes.rules import validate_graph


def test_decision_yes_no_branches_can_continue_into_operations():
    process_id = str(uuid4())
    decision = ProcessNode(process_id=process_id, node_code="DEC", node_type="decision", name="¿Conforme?")
    yes_operation = ProcessNode(process_id=process_id, node_code="OP-YES", node_type="operation", name="Continuar fabricación")
    no_operation = ProcessNode(process_id=process_id, node_code="OP-NO", node_type="operation", name="Corregir material")
    yes = ProcessTransition(process_id=process_id, source_node_id=decision.node_id, target_node_id=yes_operation.node_id, transition_type="branch", label="Sí")
    no = ProcessTransition(process_id=process_id, source_node_id=decision.node_id, target_node_id=no_operation.node_id, transition_type="branch", label="No")

    result = validate_graph([decision, yes_operation, no_operation], [yes, no], require_complete_decisions=True)

    assert result == {"valid": True, "errors": []}
