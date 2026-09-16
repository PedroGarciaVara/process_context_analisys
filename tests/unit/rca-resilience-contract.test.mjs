import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/tree-shell.js", import.meta.url), "utf8");
const analysis = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/rca/analisis_causas.js", import.meta.url), "utf8");
const treeApi = readFileSync(new URL("../../uc_bib_solv/webapp/js/api/causas.js", import.meta.url), "utf8");
const analysisApi = readFileSync(new URL("../../uc_bib_solv/webapp/js/api/analysis.js", import.meta.url), "utf8");

test("tree distinguishes loading, empty, offline, forbidden and retryable error states", () => {
  for (const state of ["loading", "empty", "offline", "forbidden", "error"]) assert.match(shell, new RegExp(state));
  assert.match(shell, /dataset\.action = "tree-retry"/);
  assert.match(shell, /aria-live/);
  assert.match(shell, /correlation/);
});

test("analysis exposes retry and preserves form state on network failures", () => {
  assert.match(analysis, /offline/);
  assert.match(analysis, /forbidden/);
  assert.match(analysis, /Reintentar/);
  assert.match(analysis, /errorSummary/);
  assert.match(analysis, /readScientificForm/);
});

test("move/delete and scientific writes are explicit API operations with retry", () => {
  assert.match(treeApi, /retryMoveCausa/);
  assert.match(treeApi, /deleteCausa/);
  assert.match(analysisApi, /retrySaveAnalysisResult/);
  assert.match(analysisApi, /reopenAnalysis/);
  assert.doesNotMatch(shell, /catch \(\) => null/);
});
