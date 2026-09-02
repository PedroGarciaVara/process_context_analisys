import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/procesos.js", import.meta.url), "utf8");
const detailSource = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/bpm/procesos_detalle.js", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../../uc_bib_solv/webapp/js/api/process-modeling.js", import.meta.url), "utf8");
const pageComponents = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/bpm-page.js", import.meta.url), "utf8");

test("procesos renderiza detalle BPM y mantiene contratos", () => {
  assert.match(pageComponents, /data-action="process-detail"/);
  assert.match(pageComponents, /data-action="process-contracts"/);
  assert.match(detailSource, /process-page-form/);
  assert.doesNotMatch(source, /data-action="process-tree"/);
  assert.match(source, /renderBpmProcessActions/);
});

test("el detalle BPM carga y guarda nombre y descripción", () => {
  assert.match(detailSource, /getProcess\(process\.bpmProcessId\)/);
  assert.match(detailSource, /updateProcess\(process\.bpmProcessId/);
  assert.match(detailSource, /process-page-name/);
  assert.match(detailSource, /process-page-description/);
  assert.match(apiSource, /updateProcess = \(id, data\).*method: "PATCH"/);
  assert.match(detailSource, /renderDetailHeader/);
  assert.match(detailSource, /renderPageAlert/);
});

test("la ficha BPM muestra identificación, jerarquía y estado sin versiones", () => {
  for (const field of ["process-page-code", "Identificador BPM", "process-page-parent", "process-page-level", "process-page-status"]) {
    assert.match(detailSource, new RegExp(field));
  }
  assert.doesNotMatch(detailSource, /Versiones existentes|version_id|versionId/);
});
