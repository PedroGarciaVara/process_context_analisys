import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/procesos.js", import.meta.url), "utf8");

test("el catálogo operativo ofrece borrado confirmado y refresca tras eliminar", () => {
  assert.match(source, /process-delete-modal/);
  assert.match(source, /process-delete-confirm/);
  assert.match(source, /process-delete-acknowledge/);
  assert.match(source, /deleteConfirm\.disabled = true/);
  assert.match(source, /deleteAcknowledge\?\.checked/);
  assert.match(source, /modelo BPM y sus dependientes/);
  assert.match(source, /referencias activas/);
  assert.match(source, /deleteProcess\(processToDelete, \{ cascade: true \}\)/);
  assert.match(source, /eventBus\.emit\("catalog:refresh"\)/);
  assert.match(source, /studio-procesos/);
});

test("el borrado del catálogo usa el UUID BPM y la API de modelado canónica", () => {
  assert.match(source, /renderBpmProcessActions\(item\.id, item\.bpmProcessId\)/);
  assert.match(source, /import \{ deleteProcess \} from "\.\.\/\.\.\/api\/process-modeling\.js"/);
});

test("las listas operativas no imprimen el ID interno como contenido visible", () => {
  assert.doesNotMatch(source, /font-mono-sm[^>]*>\$\{escapeHtml\(item\.id\)\}/);
  assert.doesNotMatch(source, />ID del proceso</);
});
