import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/procesos_v02.js", import.meta.url), "utf8");

test("el borrado de procesos revisa contratos antes de ejecutar", () => {
  assert.match(source, /id=\"process-delete-modal\"/);
  assert.match(source, /Contratos asociados/);
  assert.match(source, /data-action=\"process-delete-contract\"/);
  assert.match(source, /data-action=\"process-delete-confirm\"/);
  assert.match(source, /filterContracts\(AppState, processId, \"all\"\)/);
  assert.match(source, /if \(contracts\.length\) \{/);
});

test("las listas operativas no imprimen el ID interno como contenido visible", () => {
  assert.doesNotMatch(source, /font-mono-sm[^>]*>\$\{escapeHtml\(item\.id\)\}/);
  assert.doesNotMatch(source, />ID del proceso</);
});
