import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/contratos.js", import.meta.url), "utf8");
const operationalSource = readFileSync(new URL("../../uc_bib_solv/webapp/js/core/operational.js", import.meta.url), "utf8");
const contractUiSource = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/contract-ui.js", import.meta.url), "utf8");

test("el modal declara selectores separados para proceso y operación BPM", () => {
  assert.match(source, /contract-create-v02-scope-type/);
  assert.match(source, /contract-create-v02-process-search/);
  assert.match(source, /contract-create-v02-process-scope/);
  assert.match(source, /contract-create-v02-operation-search/);
  assert.match(source, /contract-create-v02-operation-scope/);
  assert.match(contractUiSource, /No hay alcances BPM disponibles/);
  assert.match(source, /Este proceso no tiene operaciones/);
});

test("la página expone un filtro BPM y la cascada limita operaciones al proceso", () => {
  assert.match(source, /contract-process-filter/);
  assert.match(source, /item\.bpmProcessId\) === String\(processId\)/);
  assert.match(source, /createOperationScopeInput\.disabled = !processId/);
  assert.match(source, /clearOperation: true/);
});

test("el alta envía el identificador BPM del alcance elegido", () => {
  assert.match(source, /bpmNodeId: createOperationScopeInput\?\.value/);
  assert.match(source, /bpmProcessId: createProcessScopeInput\?\.value/);
});

test("el nombre editado no se sobrescribe al cambiar el alcance", () => {
  assert.match(source, /createNameInput\.dataset\.userEdited/);
  assert.match(source, /!createNameInput\.dataset\.userEdited/);
});

test("los alcances consultan el catálogo de página como respaldo", () => {
  assert.match(operationalSource, /getOperationalPageData\(state, "contratos"\)\?\.catalog/);
  assert.match(operationalSource, /pageScopes/);
});

test("el detalle sustituye la gestión inline y conserva el árbol en las filas", () => {
  assert.match(source, /data-action="contract-detail"/);
  assert.match(source, /contract-detail-v02-modal/);
  assert.match(source, /contract-detail-v02-machines/);
  assert.match(source, /data-action="contract-detail-save"/);
  assert.match(source, /data-action="contract-detail-delete"/);
  assert.match(source, /deleteContract\(contract\.id\)/);
  assert.match(source, /window\.confirm/);
  assert.match(source, /data-action="contract-tree"/);
  assert.doesNotMatch(source, /data-action="contract-machines"/);
  assert.doesNotMatch(source, /data-action="right-open-tree"/);
  assert.doesNotMatch(source, /data-action="contract-toggle"/);
  assert.doesNotMatch(source, /data-action="contract-delete"/);
  assert.doesNotMatch(source, /data-action="contract-save-machines"/);
});

test("la vista de contratos no expone status, filtros ni columna de status", () => {
  assert.doesNotMatch(source, /statusBadge|contractStatus|data-contract-filter|<[^>]*>Estado<\//);
  assert.doesNotMatch(source, /Abierto|En revision|Cerrado/);
  assert.match(source, /<th[^>]*>Contrato<\/th>/);
  assert.match(source, /<th[^>]*>Proceso<\/th>/);
  assert.match(source, /<th[^>]*>Maquinas<\/th>/);
});

test("el CTA de crear contrato comparte el patrón del CTA principal operativo", () => {
  assert.match(source, /class="px-lg py-md bg-primary text-on-primary rounded-lg font-label-md shadow-sm hover:opacity-90" data-action="contract-create-open"/);
  assert.match(source, /material-symbols-outlined align-middle mr-xs">add<\/span>Crear contrato/);
});
