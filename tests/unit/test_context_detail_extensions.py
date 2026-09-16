import unittest

from uc_bib_solv.modules.bpm.domain.processes.context import ContextDetail


class ContextDetailExtensionTests(unittest.TestCase):
    def test_round_trip_preserves_unknown_top_level_extensions(self):
        payload = {
            "context_type": "node",
            "context_id": "node-1",
            "family": "industrial",
            "schema_version": "1.0",
            "data": {"inputs": ["Receta"], "custom_data": {"value": 2}},
            "source": {"system": "fixture"},
            "provenance": {"quality": "verified"},
            "vendor_extension": {"revision": 7},
        }

        result = ContextDetail.from_payload(payload, "fallback").to_dict()

        self.assertEqual(result, payload)

    def test_canonical_fields_cannot_be_overwritten_by_extensions(self):
        payload = {"context_type": "node", "data": {}, "source": {}, "provenance": {}, "extra": True}
        result = ContextDetail.from_payload(payload, "node-2").to_dict()
        self.assertEqual(result["context_id"], "node-2")
        self.assertTrue(result["extra"])


if __name__ == "__main__":
    unittest.main()
