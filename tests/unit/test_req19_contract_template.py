"""Pure R19 contract and analysis invariants (no PostgreSQL dependency)."""

import unittest

from uc_bib_solv.modules.bpm.domain.contracts.entities import Contract
from uc_bib_solv.modules.bpm.domain.contracts.rules import validate_contract_payload
from uc_bib_solv.modules.bpm.domain.shared.exceptions import BpmDomainError
from uc_bib_solv.modules.rca_tree.domain.analyses.entities import validate_transition


class Req19ContractInvariantTests(unittest.TestCase):
    def test_kpi_and_exclusive_scope_are_required(self):
        with self.assertRaises(BpmDomainError):
            validate_contract_payload({"name": "C", "bpmProcessId": "not-a-uuid"})
        with self.assertRaises(BpmDomainError):
            validate_contract_payload({"name": "C", "kpi_description": "", "bpmProcessId": "550e8400-e29b-41d4-a716-446655440000"})

    def test_contract_roundtrip_keeps_kpi_metadata(self):
        contract = Contract(
            None,
            "Contrato",
            bpm_process_id="550e8400-e29b-41d4-a716-446655440000",
            kpi_description="Disponibilidad",
            kpi_args="turnos",
            kpi_function="promedio",
        )
        self.assertEqual(contract.to_payload()["kpi_description"], "Disponibilidad")
        self.assertEqual(contract.to_payload()["kpi_args"], "turnos")

    def test_analysis_can_reopen_only_through_valid_states(self):
        self.assertEqual(validate_transition("cerrado", "abierto"), "abierto")
        with self.assertRaises(Exception):
            validate_transition("cerrado", "borrador")


if __name__ == "__main__":
    unittest.main()
