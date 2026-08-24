import ast
import re
import unittest
from pathlib import Path

from uc_bib_solv.modules.bpm.adapters.outbound.postgres.pm_process_repo import _node_record


class Req12FixtureSeedContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = Path(__file__).parents[2] / "scripts" / "seed_req12_bu_fixture.py"
        cls.source = cls.path.read_text(encoding="utf-8")
        cls.tree = ast.parse(cls.source)

    def test_seed_is_exact_and_uses_generic_tables(self):
        self.assertIn("886ffe83-5235-4eb8-8c1d-528041518617", self.source)
        self.assertIn("pm_process_node", self.source)
        self.assertIn("pm_process_transition", self.source)
        self.assertIn("pm_context_record", self.source)
        self.assertNotIn("CREATE TABLE", self.source.upper())

    def test_seed_has_scoped_cleanup_and_transactional_entrypoint(self):
        self.assertIn("properties->>'seed' = %s", self.source)
        self.assertIn("provenance->>'seed' = %s", self.source)
        self.assertIn("with db_cursor() as cur", self.source)
        self.assertIn("--dry-run", self.source)

    def test_conflicts_cannot_update_rows_owned_by_another_provenance(self):
        self.assertGreaterEqual(self.source.count("WHERE pm_process_node.properties->>'seed'"), 2)
        self.assertIn("WHERE pm_process_node_metadata.metadata->'provenance'->>'seed'", self.source)
        self.assertIn("WHERE pm_process_transition.properties->>'seed'", self.source)
        self.assertIn("encontró una identidad existente que no pertenece al seed", self.source)

    def test_no_specialized_product_schema_artifacts(self):
        forbidden = ("CREATE TABLE", "class BU", "class MACBU", "bu_repository", "macbu_repository")
        for token in forbidden:
            self.assertNotIn(token.lower(), self.source.lower())
        self.assertGreaterEqual(len([node for node in ast.walk(self.tree) if isinstance(node, ast.FunctionDef)]), 8)

    def test_hierarchical_test_seed_derives_descriptions_for_every_operation(self):
        path = Path(__file__).parents[2] / "scripts" / "seed_process_modeling_hierarchical_test.py"
        source = path.read_text(encoding="utf-8")
        self.assertIn("def node_description(node_type: str, code: str, name: str)", source)
        self.assertIn('return operation_description(code, name) if node_type == "operation" else None', source)
        self.assertNotIn('"description": None,', source)

    def test_node_projection_returns_persisted_description_to_api(self):
        node = _node_record({
            "node_id": "node-1",
            "node_type": "operation",
            "description": "Descripción persistida",
            "metadata": {},
            "properties": {},
        })
        self.assertEqual(node["description"], "Descripción persistida")

    def test_node_projection_compatibility_reads_legacy_metadata_description(self):
        node = _node_record({
            "node_id": "node-legacy",
            "node_type": "operation",
            "description": None,
            "metadata": {"data": {"operation_description": "Descripción legacy"}},
            "properties": {},
        })
        self.assertEqual(node["description"], "Descripción legacy")

    def test_seed_asserts_non_empty_persisted_description_for_target_operations(self):
        self.assertIn("_assert_operation_descriptions", self.source)
        self.assertIn("NULLIF(BTRIM(description), '')", self.source)
        self.assertIn("node_type = 'operation'", self.source)
        self.assertIn('"description_evidence"', self.source)

    def test_fixture_descriptions_are_functional_and_traceable(self):
        self.assertIn("PROCESS_DESCRIPTION", self.source)
        self.assertIn("OPERATION_DETAILS", self.source)
        self.assertIn("rollo de polietileno", self.source)
        self.assertIn("peso objetivo", self.source)
        self.assertIn("soldaduras laterales", self.source)
        self.assertNotIn("Descripción operativa del fixture generalista", self.source)

    def test_machine_assignments_and_operation_contracts_use_generic_context(self):
        self.assertIn("operation_machine_assignments", self.source)
        self.assertIn('"operation_contract"', self.source)
        self.assertIn('"equipment_or_machine"', self.source)
        self.assertIn('"resource"', self.source)
        self.assertIn('"description": RESOURCE_DETAILS[code]', self.source)

    def test_fixture_keeps_generic_operations_and_machine_variants_separate(self):
        self.assertIn('("DOSIFICACION", "operation", "Dosificación"', self.source)
        self.assertIn('("SOLDADURA", "operation", "Soldadura de cierre"', self.source)
        self.assertIn('("EVACUACION", "operation", "Evacuación"', self.source)
        self.assertIn('"DOSIFICACION": ["BA01", "BA02", "BA03", "BA04", "BA05", "BA06"]', self.source)
        self.assertIn('"SOLDADURA": ["SO1", "SO2"]', self.source)
        self.assertIn('"EVACUACION": ["EV01", "EV02"]', self.source)
        self.assertNotIn('("BA01", "operation"', self.source)
        self.assertNotIn('("SO1", "operation"', self.source)
        self.assertNotIn('("EV01", "operation"', self.source)

    def test_reseed_uses_stable_ids_and_scoped_cleanup(self):
        self.assertIn('uuid5(NAMESPACE, f"{SEED}:{kind}:{key}")', self.source)
        self.assertIn('DELETE FROM pm_process_node', self.source)
        self.assertIn('DELETE FROM pm_context_record', self.source)
        self.assertIn('record_key=f"operation-contract:{code}"', self.source)

    def test_fixture_resolves_to_canonical_relational_ids(self):
        self.assertIn('SELECT id, nombre FROM proceso WHERE nombre = %s FOR UPDATE', self.source)
        self.assertIn('SELECT id, nombre FROM maquina WHERE nombre = %s FOR UPDATE', self.source)
        self.assertIn('SELECT id, proceso_id, nombre FROM contrato', self.source)
        self.assertIn('INSERT INTO contrato_maquina(contrato_id, maquina_id)', self.source)
        self.assertIn('"canonical_process_id": canonical["proceso_id"]', self.source)
        self.assertIn('"canonical_contract_id": canonical["contracts"][code]["id"]', self.source)
        self.assertIn('"machine_id": canonical["machines"][machine]["id"]', self.source)

    def test_fixture_does_not_use_textual_machine_refs_as_identity(self):
        self.assertIn('"maquina_ids": [canonical["machines"][item]["id"]', self.source)
        self.assertIn('"machine_ids": [canonical["machines"][machine]["id"]', self.source)
        self.assertIn('"cardinality": "one generic operation contract to many canonical machines via contrato_maquina"', self.source)
        self.assertIn('if len(rows) > 1:', self.source)
        self.assertIn('raise RuntimeError(f"Contrato canónico duplicado para la operación {code}")', self.source)

    def test_canonical_cleanup_is_scoped_without_historical_remapping(self):
        self.assertIn('ON CONFLICT DO NOTHING', self.source)
        self.assertIn('WHERE version_id = %s AND provenance->>\'seed\' = %s', self.source)
        self.assertNotRegex(self.source, r"(?i)\bDELETE\s+FROM\s+contrato(?!\w)")
        self.assertNotRegex(self.source, r"(?i)\bDELETE\s+FROM\s+maquina(?!\w)")

    def test_canonical_schema_has_fk_guards_for_orphan_detection(self):
        schema = (Path(__file__).parents[2] / "db_management" / "schema.sql").read_text(encoding="utf-8")
        self.assertIn('proceso_id INT NOT NULL REFERENCES proceso(id)', schema)
        self.assertIn('contrato_id INT NOT NULL REFERENCES contrato(id)', schema)
        self.assertIn('maquina_id INT NOT NULL REFERENCES maquina(id)', schema)
        self.assertIn('if int(row["proceso_id"]) != canonical_process_id:', self.source)
        self.assertIn('canonical_machine_id', self.source)

    def test_seed_reconciles_and_asserts_canonical_operation_machine_links(self):
        self.assertIn("DELETE FROM contrato_maquina", self.source)
        self.assertIn("ANY(%s::int[])", self.source)
        self.assertIn("def _assert_canonical_mapping", self.source)
        self.assertIn("Cardinalidad operación-máquina incorrecta", self.source)
        self.assertIn("Asignación operación-máquina no coincide", self.source)
        self.assertIn('"canonical_evidence"', self.source)

    def test_process_modeling_api_projects_canonical_relations(self):
        repo = (Path(__file__).parents[2] / "uc_bib_solv" / "modules" / "bpm" / "adapters" / "outbound" / "postgres" / "pm_process_repo.py").read_text(encoding="utf-8")
        self.assertIn('"canonical_relations"', repo)
        self.assertIn('"contract_id"', repo)
        self.assertIn('"machine_ids"', repo)

    def test_operational_catalog_can_project_exact_bpm_version(self):
        repo = (Path(__file__).parents[2] / "uc_bib_solv" / "modules" / "bpm" / "adapters" / "outbound" / "postgres" / "operational_repository.py").read_text(encoding="utf-8")
        route = (Path(__file__).parents[2] / "uc_bib_solv" / "modules" / "bpm" / "adapters" / "inbound" / "http" / "operational_compat.py").read_text(encoding="utf-8")
        self.assertIn("def _bpm_identity", repo)
        self.assertIn("pm_process_version", repo)
        self.assertIn("request.args.get(\"version_id\")", route)
        self.assertIn('"relations"', repo)

    def test_machine_model_migration_reads_canonical_ids_and_keeps_contract_separate(self):
        migration = (Path(__file__).parents[2] / "scripts" / "migrate_req12_machine_model.py").read_text(encoding="utf-8")
        self.assertIn("properties.canonical_ids", migration)
        self.assertIn("--from-bpm-version", migration)
        self.assertIn("machine_operation_configuration", migration)
        self.assertIn("operation_id", migration)
        self.assertIn("process_version_id", migration)
        self.assertIn("JOIN contrato_maquina", migration)
        self.assertNotIn("operation_id = contract_id", migration)


if __name__ == "__main__":
    unittest.main()
