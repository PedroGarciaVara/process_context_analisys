from __future__ import annotations

from pathlib import Path
import subprocess
from unittest import TestCase

ROOT = Path(__file__).resolve().parents[2]


class CausaDetalleFrontendTests(TestCase):
    def test_build_causa_detalle_hash_uses_created_causa_id(self):
        script = """
import { buildCausaDetalleHash } from "./uc_bib_solv/webapp/js/views/causa_detalle.js";

console.log(buildCausaDetalleHash({ contrato_id: 16, causa_id: 65 }));
console.log(buildCausaDetalleHash({ contrato_id: 16, causa_id: "", parent_id: null }));
"""
        completed = subprocess.run(
            [
                "node",
                "--experimental-default-type=module",
                "--input-type=module",
                "-e",
                script,
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )

        lines = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
        self.assertEqual(lines[0], "#/causa_detalle?contrato_id=16&causa_id=65")
        self.assertEqual(lines[1], "#/causa_detalle?contrato_id=16")

    def test_get_editor_mode_options_varies_by_route_context(self):
        script = """
import { getEditorModeOptions } from "./uc_bib_solv/webapp/js/views/causa_detalle.js";

console.log(JSON.stringify(getEditorModeOptions({ contrato_id: "17" })));
console.log(JSON.stringify(getEditorModeOptions({ contrato_id: "17", parent_id: "69" })));
console.log(JSON.stringify(getEditorModeOptions({ contrato_id: "17", causa_id: "81" })));
"""
        completed = subprocess.run(
            [
                "node",
                "--experimental-default-type=module",
                "--input-type=module",
                "-e",
                script,
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )

        lines = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
        self.assertEqual(lines[0], '[{"value":"new_cause","label":"Crear causa nueva","kind":"create"},{"value":"new_contract","label":"Crear contrato nuevo","kind":"create"},{"value":"link_existing_cause","label":"Vincular causa existente","kind":"link"},{"value":"link_existing_contract","label":"Vincular contrato existente","kind":"link"}]')
        self.assertEqual(lines[1], '[{"value":"new_cause","label":"Crear causa nueva","kind":"create"},{"value":"link_existing_cause","label":"Vincular causa existente","kind":"link"},{"value":"link_existing_contract","label":"Vincular contrato existente","kind":"link"}]')
        self.assertEqual(lines[2], '[{"value":"edit_cause","label":"Editar causa","kind":"edit"}]')

    def test_derive_scope_from_detail_params_resolves_contract_and_process(self):
        script = """
import { deriveScopeFromDetailParams } from "./uc_bib_solv/webapp/js/views/causa_detalle.js";

const scope = deriveScopeFromDetailParams(
  { contrato_id: "17" },
  { data: { contratos: [{ id: 8, processId: 3 }, { id: 17, processId: 9 }] } },
);
console.log(JSON.stringify(scope));
"""
        completed = subprocess.run(
            [
                "node",
                "--experimental-default-type=module",
                "--input-type=module",
                "-e",
                script,
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )

        self.assertEqual(completed.stdout.strip(), '{"contractId":17,"processId":9}')

    def test_derive_tree_scope_from_route_prefers_contract_in_url(self):
        script = """
import { deriveTreeScopeFromRoute } from "./uc_bib_solv/webapp/js/views/rca/arboles.js";

const scope = deriveTreeScopeFromRoute(
  { contract_id: "17" },
  { data: { contratos: [{ id: 8, processId: 3 }, { id: 17, processId: 9 }] } },
  { currentContract: 8, currentProcess: 3 },
);
console.log(JSON.stringify(scope));
"""
        completed = subprocess.run(
            [
                "node",
                "--experimental-default-type=module",
                "--input-type=module",
                "-e",
                script,
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )

        self.assertEqual(completed.stdout.strip(), '{"contractId":17,"processId":9}')

    def test_resolve_active_tree_contract_id_prefers_runtime_state(self):
        script = """
import { resolveActiveTreeContractId } from "./uc_bib_solv/webapp/js/components/tree-shell.js";
import { AppState } from "./uc_bib_solv/webapp/js/core/state.js";

AppState.currentContract = 21;
console.log(resolveActiveTreeContractId({ currentContract: 8 }, { currentContract: 17 }));
console.log(resolveActiveTreeContractId({ currentContract: 8 }, {}));
"""
        completed = subprocess.run(
            [
                "node",
                "--experimental-default-type=module",
                "--input-type=module",
                "-e",
                script,
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )

        lines = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
        self.assertEqual(lines, ["17", "21"])

    def test_normalize_hidden_node_ids_accepts_set(self):
        script = """
import { normalizeHiddenNodeIds } from "./uc_bib_solv/webapp/js/components/tree-shell.js";

const normalized = normalizeHiddenNodeIds(new Set([17, 18]));
console.log(JSON.stringify(Array.from(normalized)));
"""
        completed = subprocess.run(
            [
                "node",
                "--experimental-default-type=module",
                "--input-type=module",
                "-e",
                script,
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )

        self.assertEqual(completed.stdout.strip(), '["17","18"]')

    def test_prune_tree_removes_hidden_nodes_recursively(self):
        script = """
import { pruneTree } from "./uc_bib_solv/webapp/js/components/tree-shell.js";

const tree = [
  { id: 1, children: [{ id: 2, children: [] }, { id: 3, children: [] }] },
  { id: 4, children: [] },
];
console.log(JSON.stringify(pruneTree(tree, new Set([3, 4]))));
"""
        completed = subprocess.run(
            [
                "node",
                "--experimental-default-type=module",
                "--input-type=module",
                "-e",
                script,
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )

        self.assertEqual(completed.stdout.strip(), '[{"id":1,"children":[{"id":2,"children":[]}]}]')
