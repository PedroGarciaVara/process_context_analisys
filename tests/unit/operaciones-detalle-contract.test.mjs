import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const detail = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/operaciones_detalle_v02.js", import.meta.url), "utf8");
const catalog = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/operaciones_v02.js", import.meta.url), "utf8");
const form = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/operacion_form.js", import.meta.url), "utf8");
const modeling = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/process-modeling.js", import.meta.url), "utf8");
const bpm = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/core/bpm.js", import.meta.url), "utf8");
const pageComponents = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/components/bpm-page.js", import.meta.url), "utf8");

test("la ficha de operación carga y actualiza nodo, metadatos y etapas", () => {
  assert.match(detail, /getVersion\(versionId\)/);
  assert.match(detail, /node\.node_type !== "operation"/);
  assert.match(detail, /updateNode\(operation\.node_id/);
  assert.match(detail, /updateNodeMetadata\(operation\.node_id/);
  assert.match(detail, /updateOperationStages\(operation\.node_id/);
  assert.match(form, /name="metadata"/);
  assert.match(form, /name="stages"/);
  assert.match(bpm, /data\.version\?\.version_id \|\| data\.version_id \|\| fallbackVersionId/);
});

test("el catálogo de operaciones ofrece detalle y modal reutilizable", () => {
  assert.match(catalog, /Espacio de operaciones/);
  assert.match(pageComponents, /data-action="operation-detail"/);
  assert.match(catalog, /operation-v02-modal/);
  assert.match(catalog, /operaciones_detalle_v02\?version_id=/);
  assert.match(catalog, /encodeURIComponent\(versionId\)/);
  assert.match(catalog, /encodeURIComponent\(nodeId\)/);
  assert.match(catalog, /normalizeVersionPayload/);
  assert.doesNotMatch(catalog, /data-version-id="\$\{escapeHtml\(versionData\.version_id\)\}"/);
});

test("Editar del modelado redirige a las fichas dedicadas", () => {
  assert.match(modeling, /procesos_detalle_v02\?bpm_process_id/);
  assert.match(modeling, /operaciones_detalle_v02\?version_id/);
  assert.match(modeling, /navigateToSelectedNodeDetail\(node\)/);
  assert.match(modeling, /return navigateToSelectedNodeDetail\(node\)/);
  assert.doesNotMatch(modeling.slice(modeling.indexOf("function editSelectedNode()"), modeling.indexOf("async function deleteSelectedNode()")), /pm-node-modal-title/);
});

test("operaciones aparece en la navegación y su detalle mantiene la opción activa", () => {
  const shell = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/shell_v02.js", import.meta.url), "utf8");
  assert.match(shell, /route: "operaciones_v02", label: "Operaciones"/);
  assert.match(shell, /operaciones_detalle_v02/);
});
