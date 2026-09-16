import sys
import unittest
from pathlib import Path
from unittest.mock import Mock
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.bpm.application.dto.commands import OperationMachineAssociationCommand
from uc_bib_solv.modules.bpm.application.use_cases.operations.replace_operation_machines import ReplaceOperationMachines
from uc_bib_solv.modules.bpm.application.use_cases.nodes.update_node_metadata import UpdateNodeMetadata
from uc_bib_solv.modules.bpm.domain.processes.exceptions import ProcessModelingError


class Req21CanonicalMachineMembershipTests(unittest.TestCase):
    def test_command_accepts_ids_and_empty_set(self):
        self.assertEqual([13, 14], OperationMachineAssociationCommand.from_payload({"process_id": str(uuid4()), "machine_ids": [13, 14]}).machine_ids)
        self.assertEqual([], OperationMachineAssociationCommand.from_payload({"processId": str(uuid4()), "machineIds": []}).machine_ids)

    def test_command_rejects_bad_types_duplicates_missing_process_and_legacy_clear(self):
        process = str(uuid4())
        for payload in (
            {"process_id": process, "machine_ids": [True]},
            {"process_id": process, "machine_ids": ["13"]},
            {"process_id": process, "machine_ids": [13, 13]},
            {"machine_ids": [13]},
            {"process_id": "not-a-uuid", "machine_ids": [13]},
            {"process_id": process, "equipment": ["EV01"]},
            {"process_id": process, "operation_machine_assignments": []},
            {"process_id": process, "canonical_ids": {"maquina_ids": [13]}},
            {"process_id": process, "data": {"equipment": ["EV01"]}},
            {"process_id": process, "data": {"canonical_ids": {"maquina_ids": [13]}}},
        ):
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    OperationMachineAssociationCommand.from_payload(payload)

    def test_replace_use_case_does_not_call_port_on_rejection(self):
        port = Mock()
        with self.assertRaises(ValueError):
            ReplaceOperationMachines(port).execute(str(uuid4()), {"process_id": str(uuid4()), "equipment": ["EV01"]})
        port.replace_operation_machines.assert_not_called()

    def test_metadata_rejects_top_level_and_nested_membership_keys(self):
        nodes = Mock()
        nodes.get.return_value = {"node_id": "n"}
        use_case = UpdateNodeMetadata(type("Deps", (), {"nodes": nodes})())
        for metadata in ({"equipment": ["EV01"]}, {"data": {"operation_machine_assignments": []}}, {"canonical_ids": {"maquina_ids": [13]}}):
            with self.subTest(metadata=metadata):
                with self.assertRaises(ProcessModelingError):
                    use_case.execute("n", {"metadata": metadata})
        nodes.upsert_metadata.assert_not_called()

    def test_metadata_preserves_legitimate_fields(self):
        nodes = Mock()
        nodes.get.return_value = {"node_id": "n"}
        nodes.upsert_metadata.return_value = {"metadata": {"data": {"description": "ok"}}, "updated_at": None}
        result = UpdateNodeMetadata(type("Deps", (), {"nodes": nodes})()).execute("n", {"metadata": {"data": {"description": "ok"}}})
        self.assertEqual("ok", result["metadata"]["data"]["description"])
        nodes.upsert_metadata.assert_called_once()


if __name__ == "__main__":
    unittest.main()
