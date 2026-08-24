import unittest

from uc_bib_solv.modules.bpm.adapters.outbound.operational_postgres import BpmOperationalPostgresAdapter
from uc_bib_solv.modules.bpm.adapters.outbound.mappers import BpmOperationalMapper


class FakeBackend:
    def list_machines(self, *args):
        return [{"id": 1, "nombre": "BA01", "operational_status": "active"}]

    def list_contracts(self, *args):
        return [{"id": 2, "nombre": "Contrato", "status": "open"}]


class BpmOperationalMapperTests(unittest.TestCase):
    def _adapter(self):
        marker = object()
        return BpmOperationalPostgresAdapter(
            backend=FakeBackend(),
            machines=marker,
            contracts=marker,
            machine_contracts=marker,
            configurations=marker,
        )

    def test_machine_projection_drops_operational_status(self):
        result = self._adapter().list_machines()
        self.assertEqual([{"id": 1, "nombre": "BA01"}], result)

    def test_contract_status_is_not_removed(self):
        result = self._adapter().list_contracts()
        self.assertEqual("open", result[0]["status"])

    def test_mapper_handles_nested_catalog_rows(self):
        result = BpmOperationalMapper.row({"data": {"maquinas": [{"operational_status": "active", "id": 1}]}})
        self.assertNotIn("operational_status", result["data"]["maquinas"][0])


if __name__ == "__main__":
    unittest.main()

