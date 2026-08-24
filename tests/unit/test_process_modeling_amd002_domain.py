import unittest
from uuid import uuid4

from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessNode, ProcessTransition
from uc_bib_solv.modules.bpm.domain.processes.exceptions import ProcessModelingError
from uc_bib_solv.modules.bpm.domain.processes.rules import validate_graph


class Amd002DomainTests(unittest.TestCase):
    def test_stock_24_is_structured_and_output_roles_are_explicit(self):
        version_id = str(uuid4())
        stock = ProcessNode(
            version_id=version_id,
            node_code="STOCK",
            node_type="stock",
            name="Stock 24",
            properties={"stock": {"capacity": 24, "initial_quantity": 24, "unit": "u"}},
        )
        normal = ProcessNode(version_id=version_id, node_code="NORMAL", node_type="output", name="Normal", output_role="normal")
        waste = ProcessNode(version_id=version_id, node_code="WASTE", node_type="output", name="Waste", output_role="waste")
        self.assertEqual(stock.properties["stock"]["capacity"], 24)
        self.assertEqual(normal.output_role, "normal")
        self.assertEqual(waste.output_role, "waste")

    def test_rejects_invalid_stock(self):
        with self.assertRaises(ProcessModelingError) as context:
            ProcessNode(
                version_id=str(uuid4()),
                node_code="STOCK",
                node_type="stock",
                name="Stock",
                properties={"stock": {"capacity": 24, "initial_quantity": 25, "unit": "u"}},
            )
        self.assertEqual(context.exception.code, "invalid_stock_quantity")

    def test_decision_requires_yes_no_branch_targets(self):
        version_id = str(uuid4())
        decision = ProcessNode(version_id=version_id, node_code="DEC", node_type="decision", name="Decisión")
        normal = ProcessNode(version_id=version_id, node_code="OK", node_type="output", name="OK", output_role="normal")
        waste = ProcessNode(version_id=version_id, node_code="NOK", node_type="output", name="NOK", output_role="waste")
        yes = ProcessTransition(version_id=version_id, source_node_id=decision.node_id, target_node_id=normal.node_id, transition_type="branch", label="Sí")
        no = ProcessTransition(version_id=version_id, source_node_id=decision.node_id, target_node_id=waste.node_id, transition_type="branch", label="No")
        self.assertTrue(validate_graph([decision, normal, waste], [yes, no])["valid"])

    def test_rejects_incomplete_decision_branches(self):
        version_id = str(uuid4())
        decision = ProcessNode(version_id=version_id, node_code="DEC", node_type="decision", name="Decisión")
        output = ProcessNode(version_id=version_id, node_code="OUT", node_type="output", name="Salida", output_role="normal")
        branch = ProcessTransition(version_id=version_id, source_node_id=decision.node_id, target_node_id=output.node_id, transition_type="branch", label="Sí")
        result = validate_graph([decision, output], [branch])
        self.assertFalse(result["valid"])
        self.assertIn("decision_branches_required", {item["code"] for item in result["errors"]})


if __name__ == "__main__":
    unittest.main()
