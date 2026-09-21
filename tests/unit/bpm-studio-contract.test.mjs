import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = new URL("../../uc_bib_solv/webapp/bpm-studio.html", import.meta.url);
const cssPath = new URL("../../uc_bib_solv/webapp/css/bpm-studio.css", import.meta.url);
const jsPath = new URL("../../uc_bib_solv/webapp/js/bpm-studio.js", import.meta.url);

test("the parallel studio exposes the three complementary process views", async () => {
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /data-view="design"/);
  assert.match(html, /data-view="data"/);
  assert.match(html, /data-view="analysis"/);
  assert.match(html, /<script defer src="\.\/js\/bpm-studio\.js"><\/script>/);
});

test("the webapp exposes the studio as a routed database-backed page", async () => {
  const router = await readFile(new URL("../../uc_bib_solv/webapp/js/core/router.js", import.meta.url), "utf8");
  const views = await readFile(new URL("../../uc_bib_solv/webapp/js/views/index.js", import.meta.url), "utf8");
  const studio = await readFile(new URL("../../uc_bib_solv/webapp/js/views/bpm/studio.js", import.meta.url), "utf8");
  const source = await readFile(jsPath, "utf8");
  assert.match(router, /"studio-procesos"/);
  assert.match(views, /studio-procesos.*renderProcessStudio/);
  assert.match(studio, /bpm-studio\.html\?\$\{frameParams\.toString\(\)\}/);
  assert.match(source, /\/api\/bpm\/processes/);
  assert.match(source, /function mapDatabaseProcess/);
  assert.doesNotMatch(router, /LEGACY_ROUTE_ALIASES/);
  assert.match(studio, /sourceParams\.get\("process_id"\)/);
  assert.match(studio, /sourceParams\.get\("node_id"\)/);
});

test("nodes can be placed and connected directly on the canvas", async () => {
  const html = await readFile(htmlPath, "utf8");
  const source = await readFile(jsPath, "utf8");
  assert.match(html, /data-tool="connect"/);
  assert.match(source, /function completeConnection/);
  assert.match(source, /kind: "connect"/);
  assert.match(source, /kind: "move"/);
  assert.match(source, /manualPositions\[payload\.nodeId\]/);
  assert.match(source, /data-add-decision-branch/);
  assert.match(source, /nextDecisionBranchLabel/);
  assert.match(source, /Continuar proceso/);
  assert.match(source, /Gestionar no conformidad/);
});

test("the studio exposes business context without leaving the canvas", async () => {
  const source = await readFile(jsPath, "utf8");
  assert.match(source, /data-inspector-tab="context"/);
  assert.match(source, /function loadNodeContext/);
  assert.match(source, /\/context\?node_id=/);
  assert.match(source, /\/api\/bpm\/machines\?operationId=/);
  assert.match(source, /Contrato operativo/);
  assert.match(source, /Procedencia verificable/);
});

test("multi-selection provides visual alignment and distribution tools", async () => {
  const html = await readFile(htmlPath, "utf8");
  const source = await readFile(jsPath, "utf8");
  assert.match(html, /id="selection-toolbar"/);
  for (const mode of ["top", "middle", "bottom", "left", "center", "right", "distribute-x", "distribute-y"]) {
    assert.match(html, new RegExp(`data-align="${mode}"`));
  }
  assert.match(source, /selectedNodeIds = new Set/);
  assert.match(source, /function alignSelection/);
  assert.match(source, /event\.ctrlKey \|\| event\.metaKey/);
  assert.match(source, /la semántica del grafo no ha cambiado/);
});

test("subprocess nodes navigate through their canonical child process relation", async () => {
  const html = await readFile(htmlPath, "utf8");
  const source = await readFile(jsPath, "utf8");
  assert.match(html, /data-action="navigate-parent"/);
  assert.match(source, /data-open-subprocess/);
  assert.match(source, /function openSubprocess/);
  assert.match(source, /node\.childProcessId/);
  assert.match(source, /function navigateToParent/);
  assert.match(source, /navigationStack/);
  assert.match(source, /searchParams\.set\("trail"/);
});

test("studio covers the complete process modeler management surface", async () => {
  const html = await readFile(htmlPath, "utf8");
  const source = await readFile(jsPath, "utf8");
  assert.match(html, /id="process-create-dialog"/);
  assert.match(html, /data-action="toggle-fullscreen"/);
  assert.match(source, /POST.*operation-delete|operation-delete/);
  assert.match(source, /reconnect/);
  assert.match(source, /\/validate/);
  assert.match(source, /function createProcessFromStudio/);
  assert.match(source, /data-open-operation-detail/);
  assert.match(source, /data-open-process-record/);
  assert.match(source, /data-open-machine-detail/);
  assert.match(source, /data-open-contract-detail/);
  assert.match(source, /outputRole/);
});

test("isolated operations are deleted without requesting an impossible reconnection", async () => {
  const source = await readFile(jsPath, "utf8");
  assert.match(source, /const incoming = model\.edges\.filter\(\(edge\) => edge\.target === deleting\.id\)/);
  assert.match(source, /const outgoing = model\.edges\.filter\(\(edge\) => edge\.source === deleting\.id\)/);
  assert.match(source, /const canReconnect = incoming\.length === 1 && outgoing\.length === 1/);
  assert.match(source, /let reconnect = false;/);
  assert.match(source, /if \(canReconnect\) \{/);
  assert.match(source, /else if \(!window\.confirm\(.*sin reconectar/);
  assert.match(source, /body: JSON\.stringify\(\{ reconnect \}\)/);
  assert.doesNotMatch(source, /const reconnect = canReconnect[\s\S]{0,400}if \(!reconnect\) return;/);
});

test("the industrial palette covers operational modeling semantics", async () => {
  const html = await readFile(htmlPath, "utf8");
  for (const type of ["machine", "manual", "inspection", "verification", "stock", "decision", "subprocess"]) {
    assert.match(html, new RegExp(`data-add-type="${type}"`));
  }
});

test("the exported artifact is a semantic graph without persisted coordinates", async () => {
  const source = await readFile(jsPath, "utf8");
  assert.match(source, /industrial_process_graph\/v1/);
  assert.match(source, /persisted_coordinates:\s*false/);
  assert.match(source, /industrial_kind:\s*type/);
});

test("database layouts are server-first and legacy coordinates require an explicit migration", async () => {
  const html = await readFile(htmlPath, "utf8");
  const source = await readFile(jsPath, "utf8");
  assert.match(source, /\/layout`/);
  assert.match(source, /method:\s*"PUT"/);
  assert.match(source, /layoutDirty/);
  assert.match(source, /offerLegacyLayoutMigration/);
  assert.doesNotMatch(source, /localStorage\.setItem\(positionStorageKey\(\),\s*JSON\.stringify\(manualPositions\)\)/);
  assert.match(html, /id="layout-migration-dialog"/);
  assert.match(html, /data-action="import-legacy-layout"/);
});

test("a missing layout endpoint degrades presentation without hiding database processes", async () => {
  const html = await readFile(htmlPath, "utf8");
  const css = await readFile(cssPath, "utf8");
  const source = await readFile(jsPath, "utf8");
  assert.match(source, /async function loadOptionalProcessLayout/);
  assert.match(source, /return \{ available: false, positions: \[\], error \}/);
  assert.match(source, /api\(`\/api\/bpm\/processes\/\$\{encodeURIComponent\(processId\)\}`\)/);
  assert.match(source, /loadOptionalProcessLayout\(processId\)/);
  assert.match(source, /layoutPersistenceAvailable = layout\.available/);
  assert.match(source, /BD · diseño automático/);
  assert.match(source, /layout compartido falló: \$\{layoutLoadError\.message\}/);
  assert.match(source, /if \(!databaseMode \|\| !layoutPersistenceAvailable \|\| canonicalLayoutPositions\(\)\.length\) return/);
  assert.match(html, /id="database-status" role="status" aria-live="polite"/);
  assert.match(css, /\.status-pill\.is-degraded/);
});

test("studio styles remain isolated from the existing application stylesheet", async () => {
  const html = await readFile(htmlPath, "utf8");
  const css = await readFile(cssPath, "utf8");
  assert.match(html, /\.\/css\/bpm-studio\.css/);
  assert.doesNotMatch(html, /\.\/css\/app\.css/);
  assert.match(css, /\.studio-shell/);
});
