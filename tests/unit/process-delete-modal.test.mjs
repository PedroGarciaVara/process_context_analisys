import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/procesos_v02.js", import.meta.url), "utf8");

test("el catálogo operativo no ofrece borrado de procesos", () => {
  assert.doesNotMatch(source, /process-delete-modal|process-delete-confirm|deleteProcess/);
  assert.match(source, /modelado-procesos/);
});

test("las listas operativas no imprimen el ID interno como contenido visible", () => {
  assert.doesNotMatch(source, /font-mono-sm[^>]*>\$\{escapeHtml\(item\.id\)\}/);
  assert.doesNotMatch(source, />ID del proceso</);
});
