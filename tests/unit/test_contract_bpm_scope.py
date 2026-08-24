import unittest

from uc_bib_solv.modules.bpm.domain.shared.exceptions import BpmDomainError
from uc_bib_solv.modules.bpm.domain.contracts.rules import validate_contract_payload


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


if __name__ == "__main__":
    unittest.main()
