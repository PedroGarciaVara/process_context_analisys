import unittest

from uc_bib_solv.modules.rca_tree.application.ports import BpmContextPort
from uc_bib_solv.modules.rca_tree.application.use_cases.tree import GetTree
from uc_bib_solv.modules.platform.application.ports import ContractRef, MachineRef, OperationRef, ProcessRef


class BpmTreeReferenceTests(unittest.TestCase):
    def test_references_are_opaque_and_immutable(self):
        reference = ProcessRef.from_value(" process-1 ")
        self.assertEqual("process-1", reference.identifier)
        with self.assertRaises((AttributeError, TypeError)):
            reference.identifier = "other"

    def test_contract_reference_preserves_legacy_integer_boundary(self):
        self.assertEqual(42, ContractRef.from_value("42").as_legacy_int())

    def test_context_port_and_tree_use_case_are_explicitly_available(self):
        self.assertIsNotNone(BpmContextPort)
        queries = type("Queries", (), {"tree_payload": staticmethod(lambda *args: {"contract_id": args[-1]})})()
        use_case = GetTree(queries)
        self.assertEqual(42, use_case.execute(contract_id="42")["contract_id"])
        self.assertEqual("machine-1", MachineRef.from_value("machine-1").identifier)
        self.assertEqual("operation-1", OperationRef.from_value("operation-1").identifier)


if __name__ == "__main__":
    unittest.main()
