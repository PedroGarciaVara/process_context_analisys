import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const analysis = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/rca/analisis_causas.js", import.meta.url), "utf8");
const card = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/causa-detail/hypothesis-card.js", import.meta.url), "utf8");
const treeRender = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/tree-render.js", import.meta.url), "utf8");
const treeShell = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/tree-shell.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../../uc_bib_solv/webapp/js/api/analysis.js", import.meta.url), "utf8");

test("scientific workspace exposes the complete Definir-Medir-Analizar-Validar-Controlar chain", () => {
  for (const label of ["Definir", "Medir", "Analizar", "Validar", "Controlar"]) assert.match(analysis, new RegExp(label));
  for (const field of ["prediccion", "metrica", "unidad", "fuente_datos", "periodo", "metodo", "calculo", "umbral", "evidencia", "decision", "justificacion", "accion_control", "responsable_accion", "fecha_control"]) {
    assert.match(analysis, new RegExp(field));
  }
});

test("hypothesis template exposes only the four editable template fields", () => {
  for (const field of ["cd-hypothesis-title", "cd-hypothesis-description", "cd-hypothesis-criterion", "cd-hypothesis-method"]) {
    assert.match(card, new RegExp(field));
  }
  for (const hiddenField of ["cd-hypothesis-type", "cd-hypothesis-status", "cd-hypothesis-prediction", "cd-hypothesis-metric", "cd-hypothesis-unit", "cd-hypothesis-source", "cd-hypothesis-period", "cd-hypothesis-calculation", "cd-hypothesis-threshold", "cd-hypothesis-evidence", "cd-hypothesis-decision"]) {
    assert.doesNotMatch(card, new RegExp(hiddenField));
  }
});

test("scientific UI blocks decisions without evidence/criterion and inconclusive without justification", () => {
  assert.match(analysis, /confirmada.*rechazada.*descartada/);
  assert.match(analysis, /necesita criterio/);
  assert.match(analysis, /necesita evidencia/);
  assert.match(analysis, /inconclusa.*justificaci[oó]n/);
  assert.match(analysis, /readOnly|readonly|disabled/);
});

test("analysis decision justification is visible, accessible and sent under the backend contract", () => {
  assert.match(treeRender, /Justificación de decisión/);
  assert.match(treeRender, /decision-justification/);
  assert.match(treeShell, /decision_justification/);
  assert.match(treeShell, /NO OK requiere justificación/);
});

test("legacy payloads and explicit reopen use canonical API calls", () => {
  assert.match(analysis, /result\[`legacy_\$\{key\}`\]/);
  assert.match(api, /export function reopenAnalysis/);
  assert.match(api, /status: "abierto"/);
  assert.match(analysis, /saveAnalysisResult/);
});
