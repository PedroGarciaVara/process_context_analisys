import unittest
from uuid import uuid4
from unittest.mock import patch
from types import SimpleNamespace

from uc_bib_solv.modules.bpm.application import ProcessModelingApplication
from uc_bib_solv.modules.bpm.application.use_cases.operations import CreateProcessOperation, DeleteProcessOperation
from uc_bib_solv.modules.bpm.application.ports.process_ports import (
    NodeRepositoryPort as NodePort,
    OperationRepositoryPort as OperationPort,
    ProcessRepositoryPort as ProcessPort,
    TransitionRepositoryPort as TransitionPort,
    VersionRepositoryPort as VersionPort,
)
from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessDefinition
from uc_bib_solv.modules.bpm.domain.processes.rules import validate_graph
from uc_bib_solv.modules.bpm.infrastructure.process_modeling_wiring import build_process_modeling


class ProcessModelingModuleBoundaryTests(unittest.TestCase):
    def test_domain_is_framework_free_and_preserves_validation(self):
        with self.assertRaises(ValueError):
            ProcessDefinition(process_code="", name="invalid")
        node_id, other_id = str(uuid4()), str(uuid4())
        result = validate_graph(
            [{"node_id": node_id, "node_code": "A"}, {"node_id": other_id, "node_code": "A"}],
            [{"source_node_id": node_id, "target_node_id": other_id}, {"source_node_id": other_id, "target_node_id": node_id}],
        )
        self.assertFalse(result["valid"])

    def test_application_is_composed_from_named_use_cases(self):
        self.assertTrue(hasattr(ProcessModelingApplication, "list_processes"))
        self.assertTrue(hasattr(ProcessModelingApplication, "create_operation"))
        self.assertTrue(hasattr(ProcessModelingApplication, "delete_operation"))
        self.assertTrue(hasattr(ProcessModelingApplication, "update_operation_stages"))

    def test_operations_have_explicit_create_and_delete_use_cases(self):
        self.assertTrue(hasattr(CreateProcessOperation, "execute"))
        self.assertTrue(hasattr(DeleteProcessOperation, "execute"))

    def test_ports_are_runtime_replaceable_contracts(self):
        self.assertTrue(all(port is not None for port in (NodePort, OperationPort, ProcessPort, TransitionPort, VersionPort)))

    def test_wiring_injects_repository_instances(self):
        wired = build_process_modeling(lambda: object())
        self.assertIsInstance(wired, ProcessModelingApplication)
        self.assertTrue(hasattr(wired, "list_processes"))

    def test_application_accepts_injected_bpm_ports(self):
        fake = SimpleNamespace(processes="p", versions="v", nodes="n", transitions="t")
        application = ProcessModelingApplication(fake)
        self.assertEqual("p", application._list_processes.dependencies.processes)
        self.assertEqual("v", application._get_version.dependencies.versions)


if __name__ == "__main__":
    unittest.main()
