import unittest

from uc_bib_solv.modules.bpm.application.use_cases.machines.update_machine import UpdateMachine


class MachineUpdateUseCaseTests(unittest.TestCase):
    def test_updates_the_rehydrated_entity_state(self):
        class Port:
            def __init__(self):
                self.saved = None

            def get_machine(self, machine_id):
                return {"id": machine_id, "nombre": "Bomba 01", "maquinas_tipo_id": 4, "specific_description": "Original"}

            def update_machine(self, machine_id, payload):
                self.saved = (machine_id, payload)
                return payload

        port = Port()
        result = UpdateMachine(port).execute(7, {"name": "Bomba 02", "specific_description": "Actualizada"})

        self.assertEqual(result["name"], "Bomba 02")
        self.assertEqual(result["specific_description"], "Actualizada")
        self.assertEqual(port.saved[0], 7)
        self.assertEqual(port.saved[1]["machine_type_id"], 4)
        self.assertNotIn("nombre", port.saved[1])


if __name__ == "__main__":
    unittest.main()
