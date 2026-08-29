import unittest
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

    def get_operational_catalog(self, version_id=None):
        return {"data": {"contractScopes": {"operations": [{"id": "op-1"}]}}}


class BpmUseCaseStructureTests(unittest.TestCase):
    def test_application_composes_separate_capability_ports(self):
        class Processes:
            def list_processes(self): return [{"id": 7}]

        class Operations:
            def get_operational_catalog(self, version_id=None): return {"data": {"contractScopes": {"operations": []}}}

        ports = {
            "processes": Processes(), "operations": Operations(), "contracts": object(),
            "associations": object(), "machines": object(), "machine_context": object(),
            "configurations": object(), "catalog": Operations(), "pages": object(),
        }
        application = BpmOperationalApplication(BpmOperationalDependencies(**ports))

        self.assertEqual(application.list_processes_use_case.process_port._methods, {"list_processes"})
        self.assertEqual(application.list_operations_use_case.operations_port._methods, {"get_operational_catalog"})
        self.assertEqual(application.get_contract_use_case.contract_port._methods, {"get_contract", "list_contracts"})
        self.assertEqual(application.list_machines_use_case.machine_port._methods, {"list_machines"})
        self.assertEqual(application.list_processes(), [{"id": 7}])

    def test_use_cases_are_grouped_by_bpm_capability(self):
        self.assertEqual(ListOperationalProcesses(FakePersistence()).execute(), [{"id": 1, "name": "Proceso"}])
        self.assertEqual(ListOperations(FakePersistence()).execute(), [{"id": "op-1"}])
        self.assertIsInstance(GetOperationalCatalog(FakePersistence()), GetOperationalCatalog)
        self.assertIsInstance(CreateContract, type)
        self.assertIsInstance(CreateMachine, type)

    def test_composition_preserves_compatibility_api(self):
        use_cases = BpmOperationalApplication(FakePersistence())
        self.assertEqual(use_cases.list_processes(), [{"id": 1, "name": "Proceso"}])
        self.assertEqual(use_cases.list_operations(), [{"id": "op-1"}])

    def test_generic_operational_use_case_module_is_retired(self):
        path = Path(__file__).parents[2] / "uc_bib_solv/modules/bpm/application/use_cases/operational.py"
        self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
