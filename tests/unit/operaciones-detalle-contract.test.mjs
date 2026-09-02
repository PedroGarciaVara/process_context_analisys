import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const detail = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/operaciones_detalle.js", import.meta.url), "utf8");
const catalog = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/operaciones.js", import.meta.url), "utf8");
const form = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/operacion_form.js", import.meta.url), "utf8");
const modeling = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/nodes/process-modeling.js", import.meta.url), "utf8");
const bpm = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/core/bpm.js", import.meta.url), "utf8");
const pageComponents = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/components/bpm-page.js", import.meta.url), "utf8");

test("la ficha de operación carga y actualiza nodo, metadatos y etapas", () => {
  assert.match(detail, /getProcess\(processId\)/);
  assert.match(detail, /node\.node_type !== "operation"/);
  assert.match(detail, /updateNode\(operation\.node_id/);
  assert.match(detail, /updateNodeMetadata\(operation\.node_id/);
  assert.match(detail, /updateOperationStages\(operation\.node_id/);
  assert.match(form, /name="metadata"/);
  assert.match(form, /name="stages"/);
  assert.match(bpm, /return response\?\.data \|\| response \|\| \{\}/);
});

test("el catálogo de operaciones ofrece detalle y modal reutilizable", () => {
  assert.match(catalog, /Espacio de operaciones/);
  assert.match(pageComponents, /data-action="operation-detail"/);
  assert.doesNotMatch(catalog, /operation-v02-modal/);
  assert.doesNotMatch(catalog, /version_id|versionId|normalizeVersionPayload/);
  assert.match(pageComponents, /data-node-id="\$\{escapeHtml\(nodeId\)\}"/);
  assert.doesNotMatch(catalog, /data-version-id/);
});

test("Editar del modelado redirige a las fichas dedicadas", () => {
  assert.match(modeling, /procesos_detalle\?bpm_process_id/);
  assert.match(modeling, /operaciones_detalle\?process_id/);
  assert.match(modeling, /navigateToSelectedNodeDetail\(node\)/);
  assert.match(modeling, /return navigateToSelectedNodeDetail\(node\)/);
  assert.doesNotMatch(modeling.slice(modeling.indexOf("function editSelectedNode()"), modeling.indexOf("async function deleteSelectedNode()")), /pm-node-modal-title/);
});

test("operaciones aparece en la navegación y su detalle mantiene la opción activa", () => {
  const shell = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/shell.js", import.meta.url), "utf8");
  assert.match(shell, /route: "operaciones", label: "Operaciones"/);
  assert.match(shell, /operaciones_detalle/);
});
