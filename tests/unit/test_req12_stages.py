import unittest

from app.domain.machine_modeling.exceptions import MachineModelError
from app.domain.machine_modeling.validators import canonical_stages, validate_stages


class Req12StagesTest(unittest.TestCase):
    def test_canonicalizes_two_levels_and_default_orders(self):
        stages = validate_stages([{"nombre": "Preparación", "subetapas": [{"nombre": "Verificar presión"}]}])
        self.assertEqual(stages[0]["orden"], 1)
        self.assertEqual(stages[0]["subetapas"][0]["orden"], 1)
        self.assertEqual(stages[0]["subetapas"][0]["subetapas"], [])

    def test_rejects_third_level_and_duplicate_sibling_order(self):
        with self.assertRaises(MachineModelError) as depth_error:
            validate_stages([{"nombre": "A", "subetapas": [{"nombre": "B", "subetapas": [{"nombre": "C"}]}]}])
        self.assertEqual(depth_error.exception.code, "invalid_stage_depth")
        with self.assertRaises(MachineModelError) as order_error:
            validate_stages([{"nombre": "A", "orden": 1}, {"nombre": "B", "orden": 1}])
        self.assertEqual(order_error.exception.code, "invalid_stage_order")

    def test_empty_stages_are_backward_compatible(self):
        self.assertEqual(validate_stages(None), [])
        self.assertEqual(validate_stages([]), [])

    def test_versioned_envelope_round_trip_is_deterministic(self):
        envelope = canonical_stages({"schema_version": 1, "etapas": [
            {"id": "b", "nombre": "B", "orden": 2, "subetapas": []},
            {"id": "a", "nombre": "A", "orden": 1, "subetapas": []},
        ]}, envelope=True)
        self.assertEqual(envelope["schema_version"], 1)
        self.assertEqual([item["id"] for item in envelope["etapas"]], ["a", "b"])
        with self.assertRaises(MachineModelError) as version_error:
            canonical_stages({"schema_version": 2, "etapas": []})
        self.assertEqual(version_error.exception.code, "unsupported_stages_version")

    def test_ids_are_preserved_when_names_and_order_change(self):
        stages = validate_stages([{"id": "stage-1", "nombre": "Nueva", "orden": 1, "subetapas": [{"id": "sub-1", "nombre": "Paso", "orden": 1}]}])
        self.assertEqual((stages[0]["id"], stages[0]["subetapas"][0]["id"]), ("stage-1", "sub-1"))


if __name__ == "__main__":
    unittest.main()
