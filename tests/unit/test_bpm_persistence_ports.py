import unittest

from uc_bib_solv.modules.bpm.adapters.outbound.postgres import BpmPostgresPersistenceAdapter


class BpmPersistencePortTests(unittest.TestCase):
    def test_adapter_keeps_injected_repository_ports(self):
        adapter = BpmPostgresPersistenceAdapter(
            processes="processes",
            nodes="nodes",
            transitions="transitions",
            layouts="layouts",
            connection_factory="factory",
        )
        self.assertEqual("processes", adapter.processes)
        self.assertEqual("nodes", adapter.nodes)
        self.assertEqual("transitions", adapter.transitions)
        self.assertEqual("layouts", adapter.layouts)
        self.assertEqual("factory", adapter.connection_factory)

if __name__ == "__main__":
    unittest.main()
