import unittest
from uuid import uuid4

from uc_bib_solv.modules.bpm.domain import (
    Contract,
    Machine,
    MachineContractAssociation,
    Operation,
    Process,
    Stage,
)
from uc_bib_solv.modules.bpm.domain.shared.exceptions import BpmDomainError


class BpmDomainTests(unittest.TestCase):
    def test_bpm_owns_operational_entities(self):
        process_id = str(uuid4())
        version_id = str(uuid4())
        operation_id = str(uuid4())

        process = Process(process_id=process_id, process_code="PROC-01", name="Proceso")
        operation = Operation(operation_id, version_id, "OP-01", "Operación")
        machine = Machine(1, "M-01", 2)
        contract = Contract(3, "Contrato", bpm_process_id=process_id)
        association = MachineContractAssociation(contract.contract_id, machine.machine_id)

        self.assertEqual(process.process_id, process_id)
        self.assertEqual(operation.reference.node_id, operation_id)
        self.assertEqual(contract.bpm_process_id, process_id)
        self.assertEqual((association.contract_id, association.machine_id), (3, 1))

    def test_contract_requires_exactly_one_bpm_scope(self):
        with self.assertRaises(BpmDomainError):
            Contract(None, "Sin alcance")
        with self.assertRaises(BpmDomainError):
            Contract(None, "Dos alcances", bpm_process_id=str(uuid4()), bpm_node_id=str(uuid4()))

    def test_operation_and_stage_validate_identity_and_text(self):
        with self.assertRaises(BpmDomainError):
            Operation(str(uuid4()), "not-a-uuid", "OP-01", "Operación")
        with self.assertRaises(BpmDomainError):
            Stage("", "Etapa", 1)

    def test_machine_has_no_operational_status(self):
        machine = Machine(1, "M-01")
        self.assertFalse(hasattr(machine, "operational_status"))


if __name__ == "__main__":
    unittest.main()
