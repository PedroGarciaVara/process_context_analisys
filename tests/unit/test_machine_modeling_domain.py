import unittest
from uuid import uuid4

from uc_bib_solv.modules.bpm.domain.machines.entities import Machine, MachineOperationConfiguration, MachineType
from uc_bib_solv.modules.bpm.domain.machines.exceptions import MachineModelError
from uc_bib_solv.modules.bpm.domain.machines.validators import classify_field, validate_operation_identity


class MachineModelingDomainTests(unittest.TestCase):
    def test_three_levels_classify_fields(self):
        self.assertEqual(classify_field(common=True), "machine_type")
        self.assertEqual(classify_field(permanent=True), "machine")
        self.assertEqual(classify_field(contextual=True), "machine_operation_configuration")

    def test_type_and_machine_require_separated_semantics(self):
        machine_type = MachineType(name="Pump", operating_principle="Centrifugal", general_technical_description="Generic pump")
        machine = Machine(name="P-01", machine_type_id=machine_type.id or 1)
        self.assertEqual(machine.name, "P-01")
        with self.assertRaises(MachineModelError):
            classify_field(common=True, permanent=True)

    def test_configuration_requires_bpm_operation_identity_and_validity(self):
        with self.assertRaises(MachineModelError):
            MachineOperationConfiguration(machine_id=1, operation_id="not-uuid", process_id=str(uuid4()))
        with self.assertRaises(MachineModelError):
            MachineOperationConfiguration(machine_id=1, operation_id=str(uuid4()), process_id=str(uuid4()), valid_from="2026-01-02T00:00:00", valid_to="2026-01-01T00:00:00")

    def test_operation_identity_is_node_id_and_process_scoped(self):
        node_id = str(uuid4())
        process_id = str(uuid4())
        self.assertEqual(
            validate_operation_identity(
                node_id=node_id,
                node_type="operation",
                node_process_id=process_id,
                process_id=process_id,
            ),
            node_id,
        )

    def test_machine_owns_name_and_contract_assignment(self):
        machine = Machine(name="P-01", machine_type_id=1)
        machine.rename("P-02")
        machine.assign_contract(7)
        self.assertEqual(machine.name, "P-02")
        self.assertEqual(machine.contract_id, 7)
        machine.assign_contract(None)
        self.assertIsNone(machine.contract_id)


if __name__ == "__main__":
    unittest.main()
