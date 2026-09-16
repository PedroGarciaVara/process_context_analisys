import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const detailPanels = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/detail-panels.js", import.meta.url), "utf8");
const treeRender = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/tree-render.js", import.meta.url), "utf8");
const analysis = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/rca/analisis_causas.js", import.meta.url), "utf8");

test("hypothesis template card projects definition fields only", () => {
  const cardSource = detailPanels.slice(detailPanels.indexOf("export function renderHypothesisCard"), detailPanels.indexOf("export function renderHypothesisList"));
  assert.doesNotMatch(cardSource, /renderStatusPill|renderMiniMeta|Tipo|Métrica|Decisión|hypothesis\.(tipo|metrica|decision|estado)/);
  assert.match(cardSource, /hypothesis\.nombre \|\| hypothesis\.name \|\| hypothesis\.descripcion/);
  assert.match(cardSource, /hypothesis\.descripcion/);
  assert.match(cardSource, /hypothesis\.criterio_validacion/);
  assert.match(cardSource, /hypothesis\.metodo \|\| hypothesis\.method/);
});

test("template tree hides evaluation chips while analysis tree keeps them", () => {
  assert.match(treeRender, /if \(showEvaluation\)[\s\S]*renderStatusChip\(state\)/);
  assert.match(treeRender, /if \(isAnalysisMode\) head\.appendChild\(renderStatusChip\(state, isActive\)\)/);
  assert.match(treeRender, /renderHypothesisSummary\(hypotheses, 2, isAnalysisMode\)/);
  assert.match(treeRender, /analysisMode: isAnalysisMode/);
  assert.match(treeRender, /if \(isAnalysisMode\) header\.appendChild\(renderStatusChip\(nodeState\)\)/);
  assert.match(treeRender, /const isAnalysisMode = payload\.view === "analisis_causas_v2";[\s\S]*const nodeState = isAnalysisMode && hypotheses\.length/);
  assert.match(treeRender, /hypothesis\.nombre \|\| hypothesis\.name \|\| hypothesis\.descripcion/);
  assert.match(treeRender, /const descriptionValue = hypothesis\.descripcion \|\| \"\"/);
  assert.match(treeRender, /descriptionValue && descriptionValue !== titleValue/);
  assert.match(treeRender, /Hipotesis sin titulo/);
  assert.match(treeRender, /hypothesis\.metodo \|\| hypothesis\.method/);
});

test("scientific analysis retains metric and decision fields", () => {
  assert.match(analysis, /id="analysis-metric"/);
  assert.match(analysis, /id="analysis-decision"/);
  assert.match(analysis, /<span[^>]*>Métrica<\/span>/);
  assert.match(analysis, /<span[^>]*>Decisión<\/span>/);
});
