import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/tree-shell.js", import.meta.url), "utf8");
const render = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/tree-render.js", import.meta.url), "utf8");
const dialog = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/tree-move-dialog.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../../uc_bib_solv/webapp/js/api/causas.js", import.meta.url), "utf8");
const detailPanels = readFileSync(new URL("../../uc_bib_solv/webapp/js/components/detail-panels.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../../uc_bib_solv/webapp/js/app.js", import.meta.url), "utf8");
const arboles = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/rca/arboles.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../uc_bib_solv/webapp/css/michelin-ui.css", import.meta.url), "utf8");
const modalStyles = readFileSync(new URL("../../uc_bib_solv/webapp/css/modal.css", import.meta.url), "utf8");

test("move command and drag/drop share one request event and drop does not call API", () => {
  assert.match(render, /rca:cause-move-request/);
  assert.match(shell, /rca:cause-move-request/);
  assert.match(shell, /openMoveDialog/);
  assert.doesNotMatch(render, /moveCausa\s*\(/);
  assert.match(dialog, /onMove\(model\.cause\.id/);
  assert.match(api, /export function moveCausa\(causaId, payload\)/);
});

test("move dialog has explicit confirmation, preview, invalid destinations and required reason", () => {
  assert.match(dialog, /Vista previa/);
  assert.match(dialog, /Confirmar movimiento/);
  assert.match(dialog, /reason\.required = true/);
  assert.match(dialog, /descendants\.has/);
  assert.match(dialog, /String\(node\.id\) !== String\(cause\.id\)/);
  assert.match(dialog, /model\.isRoot/);
  assert.match(dialog, /nodeVersion\(model\.cause\) === null/);
  assert.match(dialog, /Reintentar movimiento/);
});

test("move dialog is keyboard and screen-reader operable", () => {
  assert.match(dialog, /role", "dialog"/);
  assert.match(dialog, /aria-modal", "true"/);
  assert.match(dialog, /aria-describedby/);
  assert.match(dialog, /aria-live/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(dialog, /event\.key !== "Tab"/);
  assert.match(dialog, /lastFocus\?\.focus/);
});

test("delete remains non-optimistic in the tree shell", () => {
  assert.match(shell, /await deleteCausa\(deleteTargetId\)/);
  assert.match(shell, /await loadPayload\(\)/);
  assert.match(shell, /El nodo seguirá visible hasta confirmar el servidor/);
  assert.doesNotMatch(shell, /hiddenNodeIds\.add/);
});

test("RCA delete confirmation is a body-level viewport overlay above the shell header", () => {
  assert.match(shell, /querySelectorAll\('\.modal-overlay\[data-modal-kind="rca-delete"\]\'\)/);
  assert.match(shell, /document\.body\.appendChild\(modalNodeClone\)/);
  assert.match(detailPanels, /data-modal-kind.*rca-delete/);
  assert.match(modalStyles, /\.modal-overlay\[data-modal-kind="rca-delete"\]\s*\{[\s\S]*z-index:\s*1100/);
});

test("RCA delete modal cleans its body portal and supports accessible keyboard dismissal", () => {
  assert.match(app, /mountedPage\?\.beforeUnmount\?\.\(\)/);
  assert.match(arboles, /beforeUnmount\(\)[\s\S]*treePage\.beforeUnmount/);
  assert.match(shell, /beforeUnmount\(\)/);
  assert.match(shell, /disposed = true/);
  assert.match(shell, /loadToken \+= 1/);
  assert.match(shell, /event\.key === "Escape"/);
  assert.match(shell, /deleteTrigger\?\.focus/);
  assert.match(detailPanels, /role: "dialog"/);
  assert.match(detailPanels, /aria-labelledby.*rca-delete-modal-title/);
  assert.match(detailPanels, /id: "rca-delete-modal-title"/);
});

test("drag/drop exposes clear valid and invalid card feedback and resets state", () => {
  assert.match(styles, /\.acv2-tree-node-button\.acv2-tree-drop-valid \.acv2-tree-card/);
  assert.match(styles, /content:\s*["']Nuevo padre["']/);
  assert.match(styles, /box-shadow:\s*0 0 0 4px/);
  assert.match(styles, /\.acv2-tree-node-button\.acv2-tree-drop-invalid \.acv2-tree-card/);
  assert.match(styles, /content:\s*["']Destino no válido["']/);
  assert.match(styles, /cursor:\s*not-allowed/);
  assert.match(render, /classList\.toggle\("acv2-tree-drop-valid", valid\)/);
  assert.match(render, /classList\.toggle\("acv2-tree-drop-invalid", !valid\)/);
  assert.match(render, /card\.classList\.add\("acv2-tree-drop-active"\)/);
  assert.match(render, /card\.classList\.remove\("acv2-tree-drop-valid", "acv2-tree-drop-invalid", "acv2-tree-drop-active"\)/);
  assert.match(render, /card\.dataset\.dragState = valid \? "drop-target" : "drop-invalid"/);
});
