import unittest

from uc_bib_solv.modules.bpm.application.use_cases.machines.create_machine import CreateMachine


class MachineCreateUseCaseTests(unittest.TestCase):
    def test_persists_the_canonical_machine_entity_state(self):
        class Port:
            def __init__(self):
                self.saved = None

            def create_machine(self, payload):
                self.saved = payload
                return payload

        port = Port()
        result = CreateMachine(port).execute({
            "name": "Bomba 01",
            "machine_type_id": 4,
            "specific_description": "Centrifuga",
        })

        self.assertEqual(result["name"], "Bomba 01")
        self.assertEqual(result["machine_type_id"], 4)
        self.assertEqual(result["specific_description"], "Centrifuga")
        self.assertEqual(port.saved, result)


if __name__ == "__main__":
    unittest.main()
