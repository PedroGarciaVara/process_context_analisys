import unittest

from uc_bib_solv.modules.bpm.application.dto.context_projection import build_node_context_detail


class ProcessContextProjectionTests(unittest.TestCase):
    def test_normalizes_aliases_and_combines_context_sources(self):
        detail = build_node_context_detail(
            {"description": "Descripción", "metadata": {"data": {"purpose": "Objetivo", "declarative_contract": "Contrato", "calibration": {"min": 1}}}},
            [{"payload": {"data": {"quality_controls": ["Peso"], "operation_machine_assignments": [{"machine_ref": "BA01"}], "sensor": {"ok": True}}}}],
        )
        self.assertEqual(detail["description"], "Descripción")
        self.assertEqual(detail["objective"], "Objetivo")
        self.assertEqual(detail["controls"], ["Peso"])
        self.assertEqual(detail["contracts_and_assignments"], ["Contrato", {"machine_ref": "BA01"}])
        self.assertEqual(detail["additional"]["calibration"], {"min": 1})
        self.assertEqual(detail["additional"]["sensor"], {"ok": True})


if __name__ == "__main__":
    unittest.main()
