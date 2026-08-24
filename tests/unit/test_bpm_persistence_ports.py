import unittest

from uc_bib_solv.modules.bpm.adapters.outbound.postgres import BpmPostgresPersistenceAdapter
from uc_bib_solv.modules.bpm.process_modeling.adapters.outbound.persistence import ProcessModelingPersistenceAdapter


class BpmPersistencePortTests(unittest.TestCase):
    def test_adapter_keeps_injected_repository_ports(self):
        adapter = BpmPostgresPersistenceAdapter(
            processes="processes",
            versions="versions",
            nodes="nodes",
            transitions="transitions",
            connection_factory="factory",
        )
        self.assertEqual("processes", adapter.processes)
        self.assertEqual("versions", adapter.versions)
        self.assertEqual("nodes", adapter.nodes)
        self.assertEqual("transitions", adapter.transitions)
        self.assertEqual("factory", adapter.connection_factory)

    def test_process_modeling_name_remains_a_compatibility_adapter(self):
        adapter = ProcessModelingPersistenceAdapter(
            processes="processes",
            versions="versions",
            nodes="nodes",
            transitions="transitions",
        )
        self.assertIsInstance(adapter, BpmPostgresPersistenceAdapter)


if __name__ == "__main__":
    unittest.main()
