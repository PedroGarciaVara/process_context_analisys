import unittest

from uc_bib_solv.modules.bpm.adapters.outbound.operational_postgres import BpmOperationalPostgresAdapter
from uc_bib_solv.modules.bpm.adapters.outbound.operational_compat import OperationalPersistenceAdapter


class BpmOperationalPersistenceTests(unittest.TestCase):
    def test_adapter_composes_operational_bpm_capabilities(self):
        adapter = BpmOperationalPostgresAdapter(
            backend="projection",
            machines="machines",
            contracts="contracts",
            machine_contracts="associations",
            configurations="configurations",
        )
        self.assertEqual("machines", adapter.machines)
        self.assertEqual("contracts", adapter.contracts)
        self.assertEqual("associations", adapter.machine_contracts)
        self.assertEqual("configurations", adapter.configurations)
        self.assertEqual("projection", adapter.backend)

    def test_legacy_adapter_is_a_bpm_compatibility_facade(self):
        adapter = OperationalPersistenceAdapter(backend="projection")
        self.assertIsInstance(adapter, BpmOperationalPostgresAdapter)
        self.assertEqual("projection", adapter.backend)


if __name__ == "__main__":
    unittest.main()
