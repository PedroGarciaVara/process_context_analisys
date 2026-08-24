import unittest

from flask import Flask

from uc_bib_solv.modules.bpm.adapters.outbound.operational_compat import OperationalPersistenceAdapter
from uc_bib_solv.modules.bpm.application.ports import BpmContextPort, BpmOperationalPort
from uc_bib_solv.modules.bpm.application import BpmOperationalApplication
from uc_bib_solv.modules.bpm.domain.shared.exceptions import BpmDomainError
from uc_bib_solv.modules.bpm.domain.machines.payload_rules import validate_machine_payload
from uc_bib_solv.modules.bpm.infrastructure.wiring import build_operational_service


class FakeBackend:
    def __init__(self):
        self.calls = []

    def create_machine(self, payload):
        self.calls.append(("create_machine", payload))
        return {"id": 3, **payload}

    def list_processes(self):
        self.calls.append(("list_processes",))
        return [{"id": 1, "name": "Proceso"}]


class OperationalModelingT8Tests(unittest.TestCase):
    def test_bpm_port_names_processes_machines_contracts_and_associations(self):
        expected = {
            "list_processes", "create_process", "update_process", "delete_process",
            "list_contracts", "create_contract", "update_contract", "toggle_contract",
            "delete_contract", "get_contract_machines", "save_contract_machines",
            "list_machines", "create_machine", "update_machine", "delete_machine",
            "get_machine_context", "list_configurations", "create_configuration",
            "get_operational_catalog", "get_operational_page_payload",
        }
        self.assertTrue(expected.issubset(set(dir(BpmOperationalPort))))
        self.assertTrue(all(name in dir(BpmContextPort) for name in ("get_process", "get_operation", "get_machine", "get_contract")))

    def test_explicit_adapter_methods_preserve_injected_backend(self):
        backend = FakeBackend()
        adapter = OperationalPersistenceAdapter(backend)
        self.assertEqual(adapter.list_processes(), [{"id": 1, "name": "Proceso"}])
        self.assertEqual(backend.calls, [("list_processes",)])

    def test_domain_machine_payload_does_not_include_operational_state(self):
        result = validate_machine_payload({"name": "Mixer", "machine_type_id": 1, "operational_status": "legacy"})
        self.assertNotIn("operational_status", result)

    def test_application_injects_fake_backend(self):
        backend = FakeBackend()
        result = BpmOperationalApplication(OperationalPersistenceAdapter(backend)).create_machine(
            {"name": "Mixer", "machine_type_id": 1}
        )
        self.assertEqual(result["id"], 3)
        self.assertNotIn("operational_status", result)
        self.assertEqual(backend.calls[0][0], "create_machine")

    def test_process_payload_does_not_include_operational_state_or_owner(self):
        from uc_bib_solv.modules.bpm.domain.processes.payload_rules import validate_process_payload

        result = validate_process_payload({"name": "Proceso", "status": "active", "status_proceso": "activo", "owner": "legacy"})
        self.assertEqual(result, {"name": "Proceso"})

    def test_outbound_forwards_reads_and_writes(self):
        backend = FakeBackend()
        adapter = OperationalPersistenceAdapter(backend)
        self.assertEqual(adapter.list_processes(), [{"id": 1, "name": "Proceso"}])
        self.assertEqual(backend.calls, [("list_processes",)])

    def test_wiring_accepts_injected_persistence(self):
        service = build_operational_service(persistence=FakeBackend())
        self.assertEqual(service.list_processes(), [{"id": 1, "name": "Proceso"}])

    def test_contract_scope_is_validated_by_bpm_entity_before_persistence(self):
        backend = FakeBackend()
        backend.create_contract = lambda payload: payload
        with self.assertRaises(BpmDomainError):
            BpmOperationalApplication(OperationalPersistenceAdapter(backend)).create_contract({"name": "Sin alcance"})

    def test_machine_contract_associations_are_validated_by_bpm_entity(self):
        backend = FakeBackend()
        backend.save_contract_machines = lambda contract_id, payload: payload
        result = BpmOperationalApplication(OperationalPersistenceAdapter(backend)).save_contract_machines(
            "4", {"machineIds": [1, 2]}
        )
        self.assertEqual(result, {"machine_ids": [1, 2]})

    def test_http_contract_keeps_operational_routes(self):
        from uc_bib_solv.modules.bpm.adapters.inbound.http.operational_compat import bp

        app = Flask(__name__)
        app.register_blueprint(bp)
        paths = {rule.rule for rule in app.url_map.iter_rules()}
        self.assertIn("/api/operational/catalog", paths)
        self.assertIn("/api/operational/machines", paths)
        self.assertIn("/api/operational/contracts/<contract_id>/machines", paths)


if __name__ == "__main__":
    unittest.main()
