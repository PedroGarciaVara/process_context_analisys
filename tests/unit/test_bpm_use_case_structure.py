import unittest
import inspect
from pathlib import Path

from uc_bib_solv.modules.bpm.application import BpmOperationalApplication
from uc_bib_solv.modules.bpm.application.use_cases.catalog import GetOperationalCatalog
from uc_bib_solv.modules.bpm.application.use_cases.contracts import CreateContract
from uc_bib_solv.modules.bpm.application.use_cases.machines import CreateMachine
from uc_bib_solv.modules.bpm.application.use_cases.operations import ListOperations
from uc_bib_solv.modules.bpm.application.use_cases.processes import ListOperationalProcesses
from uc_bib_solv.modules.bpm.application.ports import BpmOperationalDependencies


class FakePersistence:
    def list_processes(self):
        return [{"id": 1, "name": "Proceso"}]

    def list_operations(self, process_id=None):
        return [{"id": "op-1"}]


class BpmUseCaseStructureTests(unittest.TestCase):
    def test_application_composes_separate_capability_ports(self):
        class Processes:
            def list_processes(self): return [{"id": 7}]

        class Operations:
            def list_operations(self, process_id=None): return []

        ports = {
            "processes": Processes(), "operations": Operations(), "contract_queries": Operations(), "contract_commands": Operations(),
            "association_queries": Operations(), "association_commands": Operations(), "machine_queries": Operations(), "machine_commands": Operations(), "machine_context": object(),
            "configuration_queries": Operations(), "configuration_commands": Operations(), "catalog": Operations(), "pages": object(),
        }
        application = BpmOperationalApplication(BpmOperationalDependencies(**ports))

        self.assertEqual(application.list_processes_use_case.process_port._methods, {"list_processes"})
        self.assertEqual(application.list_operations_use_case.operations_port._methods, {"list_operations"})
        self.assertEqual(application.get_contract_use_case.contract_port._methods, {"get_contract"})
        self.assertEqual(application.create_contract_use_case.contract_port._methods, {"create_contract"})
        self.assertEqual(application.list_machines_use_case.machine_port._methods, {"list_machines"})
        self.assertEqual(application.create_machine_use_case.machine_port._methods, {"create_machine"})
        self.assertEqual(application.list_configurations_use_case.configuration_port._methods, {"list_configurations"})
        self.assertEqual(application.get_contract_machines_use_case.association_port._methods, {"get_contract_machines"})
        self.assertEqual(application.list_processes(), [{"id": 7}])
        self.assertEqual(
            list(inspect.signature(application.list_machines).parameters),
            ["process_id", "contract_id", "operation_id", "bpm_process_id"],
        )

    def test_use_cases_are_grouped_by_bpm_capability(self):
        self.assertEqual(ListOperationalProcesses(FakePersistence()).execute(), [{"id": 1, "name": "Proceso"}])
        self.assertEqual(ListOperations(FakePersistence()).execute(), [{"id": "op-1"}])
        self.assertIsInstance(GetOperationalCatalog(FakePersistence()), GetOperationalCatalog)
        self.assertIsInstance(CreateContract, type)
        self.assertIsInstance(CreateMachine, type)

    def test_application_rejects_generic_persistence(self):
        with self.assertRaises(TypeError):
            BpmOperationalApplication(FakePersistence())

    def test_generic_operational_use_case_module_is_retired(self):
        path = Path(__file__).parents[2] / "uc_bib_solv/modules/bpm/application/use_cases/operational.py"
        self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
