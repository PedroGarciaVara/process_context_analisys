import unittest
from uuid import uuid4

from uc_bib_solv.modules.bpm.application.use_cases.contracts.create_contract import CreateContract


class ContractCreateUseCaseTests(unittest.TestCase):
    def test_persists_the_canonical_contract_entity_state(self):
        class Port:
            def create_contract(self, payload):
                return payload

        process_id = str(uuid4())
        result = CreateContract(Port()).execute({"name": "Contrato", "bpm_process_id": process_id, "metrica": "M1"})
        self.assertEqual(result["name"], "Contrato")
        self.assertEqual(result["bpm_process_id"], process_id)
        self.assertEqual(result["metrica"], "M1")
        self.assertIsNone(result["bpm_node_id"])


if __name__ == "__main__":
    unittest.main()
