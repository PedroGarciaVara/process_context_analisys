import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const detail = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/operaciones_detalle.js", import.meta.url), "utf8");
const catalog = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/operaciones.js", import.meta.url), "utf8");
const form = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/operacion_form.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/bpm-studio.js", import.meta.url), "utf8");
const bpm = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/core/bpm.js", import.meta.url), "utf8");
const pageComponents = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/components/bpm-page.js", import.meta.url), "utf8");

test("la ficha de operación carga y actualiza nodo, metadatos y etapas", () => {
  assert.match(detail, /getProcess\(processId\)/);
  assert.match(detail, /node\.node_type !== "operation"/);
  assert.match(detail, /updateNode\(operation\.node_id/);
  assert.match(detail, /updateNodeMetadata\(operation\.node_id/);
  assert.match(detail, /updateOperationStages\(operation\.node_id/);
  assert.match(form, /operationMetadataMarkup\(metadata\)/);
  assert.match(form, /data-operation-stage-editor/);
  assert.match(form, /readOperationMetadata\(form\)/);
  assert.match(form, /readStageEditor/);
  assert.doesNotMatch(form, /Metadatos JSON|Etapas JSON/);
  assert.match(detail, /data-operation-machine-select/);
  assert.match(detail, /data-operation-machine-add/);
  assert.match(detail, />Seleccionar máquina</);
  assert.match(detail, /form\._operationMachineState\?\.selectedIds/);
  assert.doesNotMatch(detail, /input\[data-operation-machine\]:checked/);
  assert.match(bpm, /return response\?\.data \|\| response \|\| \{\}/);
});

test("el selector de máquinas conserva un único control de selección y un recuadro acotado", () => {
  assert.match(detail, /new Set\(/);
  assert.match(detail, /state\.selectedIds\.add\(id\)/);
  assert.match(detail, /state\.selectedIds\.delete/);
  assert.match(detail, /data-operation-machine-selected/);
  assert.match(detail, /data-operation-machine-empty/);
  assert.match(detail, /state\.selectedIds\.has\(id\).*disabled/);
  assert.doesNotMatch(detail, /machines\.map\(\(machine\) => `<label/);
});

test("el código de operación se muestra como identidad asignada y no como entrada", () => {
  assert.doesNotMatch(form, /name="node_code"/);
  assert.doesNotMatch(detail, /node_code: data\.node_code/);
});

test("el catálogo de operaciones ofrece detalle y modal reutilizable", () => {
  assert.match(catalog, /Espacio de operaciones/);
  assert.match(pageComponents, /data-action="operation-detail"/);
  assert.doesNotMatch(catalog, /operation-v02-modal/);
  assert.doesNotMatch(catalog, /version_id|versionId|normalizeVersionPayload/);
  assert.match(pageComponents, /data-node-id="\$\{escapeHtml\(nodeId\)\}"/);
  assert.doesNotMatch(catalog, /data-version-id/);
});

test("Studio redirige a las fichas dedicadas con sus identificadores", () => {
  assert.match(studio, /navigateApp\("procesos_detalle", \{ bpm_process_id:/);
  assert.match(studio, /navigateApp\("operaciones_detalle", \{ process_id: liveProcessId, node_id:/);
  assert.match(studio, /data-open-process-record/);
  assert.match(studio, /data-open-operation-detail/);
});

test("operaciones aparece en la navegación y su detalle mantiene la opción activa", () => {
  const shell = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/shell.js", import.meta.url), "utf8");
  assert.match(shell, /route: "operaciones", label: "Operaciones"/);
  assert.match(shell, /operaciones_detalle/);
});
