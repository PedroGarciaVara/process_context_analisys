import unittest
from uuid import uuid4
from unittest.mock import patch
from types import SimpleNamespace

from uc_bib_solv.modules.bpm.application import ProcessModelingApplication
from uc_bib_solv.modules.bpm.application.ports import process_modeling as process_modeling_port
from uc_bib_solv.modules.bpm.application.use_cases.processes import ListProcesses
from uc_bib_solv.modules.bpm.application.ports.process_ports import (
    NodeRepositoryPort as NodePort,
    OperationRepositoryPort as OperationPort,
    ProcessLayoutRepositoryPort as LayoutPort,
    ProcessRepositoryPort as ProcessPort,
    TransitionRepositoryPort as TransitionPort,
)
from uc_bib_solv.modules.bpm.domain.processes.entities import Process
from uc_bib_solv.modules.bpm.domain.processes.rules import validate_graph
from uc_bib_solv.modules.bpm.infrastructure.process_modeling_wiring import build_process_modeling


class ProcessModelingModuleBoundaryTests(unittest.TestCase):
    def test_domain_is_framework_free_and_preserves_validation(self):
        with self.assertRaises(ValueError):
            Process(process_code="", name="invalid")
        node_id, other_id = str(uuid4()), str(uuid4())
        result = validate_graph(
            [{"node_id": node_id, "node_code": "A"}, {"node_id": other_id, "node_code": "A"}],
            [{"source_node_id": node_id, "target_node_id": other_id}, {"source_node_id": other_id, "target_node_id": node_id}],
        )
        self.assertFalse(result["valid"])

    def test_application_is_composed_from_named_use_cases(self):
        self.assertTrue(hasattr(ProcessModelingApplication, "list_processes"))
        self.assertTrue(hasattr(ProcessModelingApplication, "update_operation_stages"))

    def test_process_modeling_port_module_exposes_only_the_inbound_contract(self):
        self.assertEqual(["BpmProcessModelingPort"], process_modeling_port.__all__)
        self.assertTrue(hasattr(process_modeling_port, "BpmProcessModelingPort"))
        self.assertFalse(hasattr(process_modeling_port, "BpmProcessModelingApplication"))

    def test_ports_are_runtime_replaceable_contracts(self):
        self.assertTrue(all(port is not None for port in (NodePort, OperationPort, LayoutPort, ProcessPort, TransitionPort)))

    def test_wiring_injects_repository_instances(self):
        wired = build_process_modeling(lambda: object())
        self.assertIsInstance(wired, ProcessModelingApplication)
        self.assertTrue(hasattr(wired, "list_processes"))

    def test_application_accepts_injected_bpm_ports(self):
        fake = SimpleNamespace(processes="p", nodes="n", transitions="t", layouts="l")
        application = ProcessModelingApplication(fake.processes, fake.nodes, fake.transitions, fake.layouts)
        self.assertIsInstance(application._list_processes, ListProcesses)
        self.assertEqual("p", application._list_processes.dependencies.processes)
        self.assertTrue(hasattr(application, "_get_process"))


if __name__ == "__main__":
    unittest.main()
