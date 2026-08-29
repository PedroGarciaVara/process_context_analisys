import unittest
import sys
from pathlib import Path
from unittest.mock import patch

from uc_bib_solv.modules.bpm.adapters.outbound.postgres.machine_model_repo import _operation_configuration

BACKEND = Path(__file__).parents[2] / "uc_bib_solv"
sys.path.insert(0, str(BACKEND))
from uc_bib_solv.modules.bpm.adapters.outbound.postgres import operational_repository  # noqa: E402


class Req12MachineProjectionTests(unittest.TestCase):
    def test_operation_configuration_is_selected_by_canonical_pair(self):
        rows = [
            {"operation_id": "op-a", "process_id": "process-a", "contract_id": 11},
            {"operation_id": "op-b", "process_id": "process-b", "contract_id": 12},
        ]
        selected = _operation_configuration(rows, "op-b", "process-b")
        self.assertEqual(selected["contract_id"], 12)
        self.assertIsNone(_operation_configuration(rows, "op-b", "process-a"))

    def test_machine_projection_keeps_bpm_contract_separate_from_first_legacy_link(self):
        machine = {"id": 7, "nombre": "BA01", "maquinas_tipo_id": 3}
        operations = [{
            "operation_id": "op-b",
            "process_id": "bpm-process",
            "contract_id": 12,
            "operational_process_id": 8,
        }]
        contracts = [
            {"id": 11, "processId": 7, "name": "Contrato histórico"},
            {"id": 12, "processId": 8, "name": "Contrato BPM"},
        ]
        processes = [
            {"id": 7, "name": "Proceso histórico"},
            {"id": 8, "name": "Proceso canónico"},
        ]
        with patch.object(operational_repository, "_process_records", return_value=processes), \
             patch.object(operational_repository, "_contract_records", return_value=contracts), \
             patch.object(operational_repository, "_links_by_machine", return_value={7: [11, 12]}), \
             patch.object(operational_repository, "_operations_by_machine", return_value={7: operations}):
            projected = operational_repository._decorate_machine(
                machine, operation_id="op-b", process_id_bpm="bpm-process"
            )

        self.assertEqual(projected["id"], 7)
        self.assertEqual(projected["machineTypeId"], 3)
        self.assertEqual(projected["contractId"], 12)
        self.assertEqual(projected["processId"], 8)
        self.assertEqual(projected["operationRelations"][0]["operation_id"], "op-b")
        self.assertEqual(projected["operationRelations"][0]["contract_id"], 12)

    def test_context_projection_keeps_machine_type_identity_in_machine_and_relations(self):
        source = (Path(__file__).parents[2] / "uc_bib_solv" / "modules" / "bpm" / "adapters" / "outbound" / "postgres" / "machine_model_repo.py").read_text(encoding="utf-8")
        self.assertIn('canonical_machine_type_id = row.get("maquinas_tipo_id")', source)
        self.assertIn('"machine_type_id": canonical_machine_type_id', source)
        self.assertIn('row["machine_id"] = row.get("id")', source)


if __name__ == "__main__":
    unittest.main()
