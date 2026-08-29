import unittest
from uuid import uuid4

from uc_bib_solv.modules.bpm.domain.processes.entities import Process, ProcessNode, ProcessTransition
from uc_bib_solv.modules.bpm.domain.processes.exceptions import ProcessModelingError
from uc_bib_solv.modules.bpm.domain.processes.rules import diagram_transitions, next_node_code, validate_graph, validate_hierarchy


class ProcessModelingDomainTests(unittest.TestCase):
    def test_next_node_code_is_scoped_by_type_and_fills_first_gap(self):
        nodes = [{"node_code": "OP-001"}, {"node_code": "OP-003"}, {"node_code": "STOCK-001"}]
        self.assertEqual(next_node_code(nodes, "operation"), "OP-002")
        self.assertEqual(next_node_code(nodes, "stock"), "STOCK-002")

    def test_decision_can_be_edited_with_one_branch_but_final_validation_requires_both(self):
        nodes = [{"node_id": "decision", "node_code": "DEC", "node_type": "decision"}, {"node_id": "yes", "node_code": "OUT", "node_type": "output", "output_role": "normal"}]
        transitions = [{"source_node_id": "decision", "target_node_id": "yes", "transition_type": "branch", "label": "Sí"}]
        self.assertTrue(validate_graph(nodes, transitions)["valid"])
        self.assertFalse(validate_graph(nodes, transitions, require_complete_decisions=True)["valid"])
    def test_entities_are_framework_free_and_serializable(self):
        process = Process(process_code="PROC-01", name="Proceso 1")
        node = ProcessNode(process_id=process.process_id, node_code="N-01", node_type="input", name="Entrada")
        other = ProcessNode(process_id=process.process_id, node_code="N-02", node_type="output", name="Salida")
        transition = ProcessTransition(process_id=process.process_id, source_node_id=node.node_id, target_node_id=other.node_id)
        self.assertEqual(process.process_code, "PROC-01")
        self.assertEqual(transition.transition_type, "sequence")

    def test_rejects_invalid_node_type_and_self_transition(self):
        process_id = str(uuid4())
        with self.assertRaises(ProcessModelingError):
            ProcessNode(process_id=process_id, node_code="bad", node_type="transport", name="No permitido")
        with self.assertRaises(ProcessModelingError):
            ProcessTransition(process_id=process_id, source_node_id=process_id, target_node_id=process_id)

    def test_graph_validation_is_deterministic_and_reports_duplicates(self):
        version_id = str(uuid4())
        nodes = [
            {"node_id": str(uuid4()), "node_code": "A"},
            {"node_id": str(uuid4()), "node_code": "A"},
        ]
        result = validate_graph(nodes, [])
        self.assertFalse(result["valid"])
        self.assertEqual(result["errors"][0]["code"], "duplicate_node_code")

    def test_hierarchy_cycle_is_rejected(self):
        result = validate_hierarchy("", {"a": "b", "b": "a"})
        self.assertEqual(result[0]["code"], "hierarchy_cycle")

    def test_process_owns_mutations_and_preserves_identity(self):
        process = Process(process_code="PROC-01", name="Inicial")
        identity = process.process_id
        process.rename("Actualizado")
        process.change_status("active")
        process.set_parent(str(uuid4()))
        self.assertEqual(process.process_id, identity)
        self.assertEqual(process.name, "Actualizado")
        self.assertEqual(process.status, "active")

    def test_process_rejects_parent_self_cycle_when_commanded(self):
        process = Process(process_code="PROC-01", name="Proceso")
        with self.assertRaises(ValueError):
            process.set_parent(process.process_id)

    def test_process_rejects_inconsistent_graph_before_persistence(self):
        process = Process(process_code="PROC-01", name="Proceso")
        node = ProcessNode(process_id=process.process_id, node_code="IN", node_type="input", name="Entrada")
        transition = ProcessTransition(process_id=process.process_id, source_node_id=node.node_id, target_node_id=str(uuid4()))
        with self.assertRaises(ProcessModelingError) as context:
            process.assert_graph_consistent([node], [transition])
        self.assertEqual(context.exception.code, "node_reference_missing")

    def test_diagram_projection_removes_only_redundant_branch_relations(self):
        decision = str(uuid4())
        yes = str(uuid4())
        no = str(uuid4())
        continuation = str(uuid4())
        nodes = [
            {"node_id": decision, "node_type": "decision"},
            {"node_id": yes, "node_type": "output"},
            {"node_id": no, "node_type": "output"},
            {"node_id": continuation, "node_type": "operation"},
        ]
        transitions = [
            {"transition_id": "branch-yes", "source_node_id": decision, "target_node_id": yes, "transition_type": "branch"},
            {"transition_id": "branch-no", "source_node_id": decision, "target_node_id": no, "transition_type": "branch"},
            {"transition_id": "legacy-decision-sequence", "source_node_id": decision, "target_node_id": yes, "transition_type": "sequence"},
            {"transition_id": "legacy-cross-branch", "source_node_id": yes, "target_node_id": no, "transition_type": "sequence"},
            {"transition_id": "valid-continuation", "source_node_id": yes, "target_node_id": continuation, "transition_type": "sequence"},
        ]

        projected = diagram_transitions(nodes, transitions)

        self.assertEqual([item["transition_id"] for item in projected], ["branch-yes", "branch-no", "valid-continuation"])
        self.assertEqual(len(transitions), 5)

    def test_diagram_projection_does_not_mutate_or_validate_away_persisted_relations(self):
        nodes = [{"node_id": "source", "node_code": "SRC", "node_type": "operation"}]
        transitions = [{"transition_id": "invalid", "source_node_id": "source", "target_node_id": "missing", "transition_type": "sequence"}]

        projected = diagram_transitions(nodes, transitions)

        self.assertEqual(projected, transitions)
        self.assertIsNot(projected[0], transitions[0])
        self.assertEqual(validate_graph(nodes, transitions)["errors"][0]["code"], "node_reference_missing")

    def test_diagram_projection_keeps_sequence_between_different_decision_branches(self):
        decision_a, decision_b = "decision-a", "decision-b"
        a_yes, a_no, b_yes, b_no = "a-yes", "a-no", "b-yes", "b-no"
        nodes = [
            {"node_id": decision_a, "node_code": "DEC-A", "node_type": "decision"},
            {"node_id": decision_b, "node_code": "DEC-B", "node_type": "decision"},
            *[
                {"node_id": node_id, "node_code": node_id.upper(), "node_type": "output"}
                for node_id in (a_yes, a_no, b_yes, b_no)
            ],
        ]
        transitions = [
            {"transition_id": "a-yes-branch", "source_node_id": decision_a, "target_node_id": a_yes, "transition_type": "branch"},
            {"transition_id": "a-no-branch", "source_node_id": decision_a, "target_node_id": a_no, "transition_type": "branch"},
            {"transition_id": "b-yes-branch", "source_node_id": decision_b, "target_node_id": b_yes, "transition_type": "branch"},
            {"transition_id": "b-no-branch", "source_node_id": decision_b, "target_node_id": b_no, "transition_type": "branch"},
            {"transition_id": "cross-decision-sequence", "source_node_id": a_yes, "target_node_id": b_yes, "transition_type": "sequence"},
        ]

        projected = diagram_transitions(nodes, transitions)

        self.assertIn("cross-decision-sequence", [item["transition_id"] for item in projected])


if __name__ == "__main__":
    unittest.main()
