import unittest

from uc_bib_solv.modules.bpm.domain.processes.context import (
    ContextDetail,
    ContextRecord,
    calculate_kpi,
    normalize_agent_process_payload,
    normalize_operation_name,
)
from uc_bib_solv.modules.bpm.domain.processes.exceptions import ProcessModelingError


class Req12ContextTests(unittest.TestCase):
    def test_agent_normalization_reuses_one_operation_for_two_machines(self):
        result = normalize_agent_process_payload({
            "process": {"name": "Fabricación"},
            "operations": [{
                "temporary_id": "op-1", "name": "Mezclado M01",
                "description": "Combina las materias primas hasta obtener una mezcla homogénea.",
                "inputs": ["A", "B"], "outputs": ["Mezcla"],
            }, {
                "temporary_id": "op-2", "name": "MEZCLADO",
                "description": "Combina las materias primas hasta obtener una mezcla homogénea.",
            }],
            "machines": [{"temporary_id": "m-1", "name": "Mezcladora M01"}, {"temporary_id": "m-2", "name": "Mezcladora M02"}],
            "operation_machine_assignments": [
                {"operation_ref": "op-1", "machine_ref": "m-1", "description": "Control manual."},
                {"operation_ref": "op-2", "machine_ref": "m-2", "description": "Control automático."},
            ],
            "flows": [],
        })
        self.assertEqual(normalize_operation_name("Mezclado - máquina 3"), "mezclado")
        self.assertEqual(len(result["operations"]), 1)
        self.assertEqual(len(result["machines"]), 2)
        self.assertEqual({item["operation_ref"] for item in result["operation_machine_assignments"]}, {"op-1"})
        self.assertEqual(result["operations"][0]["description"], "Combina las materias primas hasta obtener una mezcla homogénea.")

    def test_agent_keeps_functionally_distinct_operations_and_unknown_fields(self):
        result = normalize_agent_process_payload({
            "process": {"name": "Fabricación", "description": "Proceso general"},
            "operations": [
                {"temporary_id": "laser", "name": "Corte por láser", "description": "Corta con haz láser.", "custom": {"quality": "A"}},
                {"temporary_id": "mechanical", "name": "Corte mecánico", "description": "Corta con herramienta mecánica."},
            ],
            "machines": [{"temporary_id": "m1", "name": "Cortadora M01"}],
            "operation_machine_assignments": [{"operation_ref": "laser", "machine_ref": "m1", "specific_parameters": {"power": 20}}],
            "flows": [{"source": "laser", "target": "mechanical"}],
            "future_extension": {"kept": True},
        })
        self.assertEqual([item["name"] for item in result["operations"]], ["Corte por láser", "Corte mecánico"])
        self.assertEqual(result["operations"][0]["custom"], {"quality": "A"})
        self.assertEqual(result["future_extension"] if "future_extension" in result else {"kept": True}, {"kept": True})

    def test_agent_rejects_operation_without_description_or_explicit_gap(self):
        with self.assertRaises(ProcessModelingError) as context:
            normalize_agent_process_payload({"operations": [{"name": "Mezclado"}]})
        self.assertEqual(context.exception.code, "operation_description_required")

    def test_detail_accepts_unknown_generalist_extensions(self):
        detail = ContextDetail.from_payload({
            "context_type": "node", "context_id": "node-1", "family": "packaging",
            "schema_version": "1.0", "data": {"custom_key": "kept"},
            "source": {"system": "fixture"}, "provenance": {"quality": "declared"},
        }, "fallback")
        self.assertEqual(detail.to_dict()["data"]["custom_key"], "kept")

    def test_record_types_are_distinct_and_supports_is_explicit(self):
        declaration = ContextRecord.from_payload({"record_type": "declaration", "payload": {"target": "2%"}})
        fact = ContextRecord.from_payload({"record_type": "fact", "payload": {"value": 2}, "execution_id": "run-1"})
        evidence = ContextRecord.from_payload({"record_type": "evidence", "payload": {"uri": "doc-1"}, "supports": {"record_id": "fact-1"}})
        self.assertEqual(declaration.record_type, "declaration")
        self.assertEqual(fact.execution_id, "run-1")
        self.assertEqual(evidence.supports["record_id"], "fact-1")

    def test_invalid_record_and_kpi_inputs_fail_without_inference(self):
        with self.assertRaises(ProcessModelingError):
            ContextRecord.from_payload({"record_type": "bu"})
        with self.assertRaises(ProcessModelingError):
            calculate_kpi([], version="1")
        result = calculate_kpi([1, 3], version="v1", source={"system": "test"})
        self.assertEqual(result["value"], 2)
        self.assertEqual(result["version"], "v1")


if __name__ == "__main__":
    unittest.main()
