import unittest

from uc_bib_solv.modules.bpm.domain.shared.exceptions import BpmDomainError
from uc_bib_solv.modules.bpm.domain.contracts.rules import validate_contract_payload
from uc_bib_solv.modules.bpm.domain.contracts.entities import Contract
from uuid import uuid4


class ContractBpmScopeTests(unittest.TestCase):
    def test_accepts_process_scope(self):
        result = validate_contract_payload({"name": "Contrato", "bpmProcessId": "process-1"})
        self.assertEqual(result["bpm_process_id"], "process-1")
        self.assertNotIn("bpm_node_id", result)

    def test_accepts_operation_scope(self):
        result = validate_contract_payload({"name": "Contrato", "bpmNodeId": "node-1"})
        self.assertEqual(result["bpm_node_id"], "node-1")
        self.assertNotIn("bpm_process_id", result)

    def test_rejects_missing_or_ambiguous_scope(self):
        for payload in (
            {"name": "Contrato"},
            {"name": "Contrato", "bpmProcessId": "process-1", "bpmNodeId": "node-1"},
        ):
            with self.assertRaises(BpmDomainError):
                validate_contract_payload(payload)

    def test_contract_owns_name_and_scope_mutations(self):
        contract = Contract(contract_id=None, name="Inicial", bpm_process_id=str(uuid4()))
        contract.rename("Actualizado")
        node_id = str(uuid4())
        contract.change_scope(bpm_node_id=node_id)
        self.assertEqual(contract.name, "Actualizado")
        self.assertEqual(contract.bpm_node_id, node_id)
        self.assertIsNone(contract.bpm_process_id)


if __name__ == "__main__":
    unittest.main()
