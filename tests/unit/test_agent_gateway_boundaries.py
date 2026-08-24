import unittest
from unittest.mock import patch

from uc_bib_solv.modules.platform.adapters.agent_tools.adapters.outbound.backend_gateway import ExistingBackendGateway


class AgentGatewayBoundaryTests(unittest.TestCase):
    def test_gateway_composes_canonical_bpm_and_tree_services(self):
        operational = object()
        tree = object()
        process = object()
        with patch("uc_bib_solv.modules.bpm.infrastructure.wiring.operational_service", return_value=operational), \
             patch("uc_bib_solv.modules.rca_tree.infrastructure.wiring.build_rca_tree_service", return_value=tree):
            with patch("uc_bib_solv.modules.bpm.process_modeling.infrastructure.wiring.create_process_modeling_handlers", return_value=process):
                gateway = ExistingBackendGateway()
        self.assertIs(operational, gateway._machines)
        self.assertIs(operational, gateway._operational)
        self.assertIs(tree, gateway._causas)


if __name__ == "__main__":
    unittest.main()
