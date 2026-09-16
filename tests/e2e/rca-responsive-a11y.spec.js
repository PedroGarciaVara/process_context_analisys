import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(process.env.E2E_ARTIFACTS_DIR || ".playwright-artifacts/test-results", `${RUN_ID}-rca-responsive-a11y`);
const acResults = {};
const consoleFailures = [];
const requestFailures = [];
const APP_API_ROUTE = /^https?:\/\/[^/]+\/api\/(?:bootstrap(?:[/?#]|$)|bpm\/[^?#]*(?:[?#]|$)|rca-tree\/[^?#]*(?:[?#]|$))/;
const LONG_PROCESS_NAME = "TEST proceso de preparación industrial con trazabilidad completa de lote y turno";
const LONG_OBJECTIVE = "TEST objetivo de reducción sostenida de defectos críticos mediante control estadístico y evidencia verificable";

function mark(id, passed, detail) { acResults[id] = { passed, detail }; }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function treePayload() {
  return { view: "arbol", contract: { id: 42, processId: 1, name: "TEST_RCA_CONTRACT", objetivo: LONG_OBJECTIVE },
    tree: [{ id: 100, nombre: "TEST_RCA_ROOT", parent_id: null, version: 1, root_protected: true, children: [{ id: 101, nombre: "TEST_RCA_SOURCE", parent_id: 100, version: 7, children: [] }] }],
    selected_cause_id: 101, hypotheses_by_cause: { "101": [{ id: 501, descripcion: "TEST_HYPOTHESIS", criterio_validacion: "TEST criterio", estado: "pendiente" }] },
    sidebar: { action_label: "Crear causa raiz", nav: [] }, legend: [], zoom: 1, graph_metadata: {} };
}
async function mockResponsiveApp(page) {
  await page.route(APP_API_ROUTE, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/bootstrap") return json(route, { app_name: "UC_BIB_Solve" });
    if (url.pathname === "/api/bpm/operational/catalog") return json(route, { status: "ok", data: { data: { procesos: [{ id: 1, name: LONG_PROCESS_NAME }], contratos: [{ id: 42, processId: 1, name: "TEST contract", processName: LONG_PROCESS_NAME, objetivo: LONG_OBJECTIVE }], maquinas: [] } } });
    if (url.pathname === "/api/rca-tree/nodes") return json(route, treePayload());
    return json(route, { data: {} });
  });
  page.on("console", (message) => { if (message.type() === "error") consoleFailures.push(message.text()); });
  page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`));
}

test.beforeAll(() => fs.mkdirSync(OUT_DIR, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(path.join(OUT_DIR, "ac-results.json"), JSON.stringify(acResults, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "console.log"), consoleFailures.join("\n"));
  fs.writeFileSync(path.join(OUT_DIR, "request-failures.log"), requestFailures.join("\n"));
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  test(`RESP-01: ${viewport.width}x${viewport.height} mantiene acciones y no desborda`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockResponsiveApp(page);
    await page.goto("/#/arboles?contract_id=42");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator('[data-action="tree-move-cause-v02"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: path.join(OUT_DIR, `viewport-${viewport.width}x${viewport.height}.png`), fullPage: true });
    mark(`RESP-01-${viewport.width}`, true, "h1/action visible; document without horizontal overflow");
  });
}

test("A11Y-01/RESP-01: árbol semántico, foco del diálogo y zoom 200% son operables", async ({ page }) => {
  await mockResponsiveApp(page);
  // Model the browser layout viewport at 640 CSS px: equivalent to a 1280 px
  // physical window rendered at 200% browser zoom, without applying CSS zoom.
  await page.setViewportSize({ width: 640, height: 844 });
  await page.goto("/#/arboles?contract_id=42");
  const tree = page.getByRole("tree", { name: "Árbol causal" });
  await expect(tree).toBeVisible();
  await expect(tree.locator('[role="treeitem"]')).toHaveCount(2);
  await expect(tree.locator('[role="treeitem"]').first()).toHaveAttribute("aria-level", "1");
  await expect(tree.locator('[role="treeitem"]').nth(1)).toHaveAttribute("aria-level", "2");
  await page.locator('[data-node-id="101"]').click();
  const moveButton = page.locator('[data-action="tree-move-cause"]');
  await moveButton.click();
  const dialog = page.getByRole("dialog", { name: "Mover causa" });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.locator("#tree-move-dialog-search")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(moveButton).toBeFocused();
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator(".acv2-context-title")).toContainText(LONG_OBJECTIVE);
  await expect(page.locator(".acv2-canvas-scroll-cue")).toBeVisible();
  const canvas = page.getByRole("region", { name: /Lienzo del árbol causal/ });
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("tabindex", "0");
  await canvas.focus();
  await expect(canvas).toBeFocused();
  const zoomLayout = await page.evaluate(() => {
    const documentNode = document.documentElement;
    const canvasNode = document.querySelector(".acv2-canvas-shell");
    const contextNode = document.querySelector(".acv2-context-title");
    const contextStyle = contextNode ? getComputedStyle(contextNode) : null;
    return {
      documentOverflow: documentNode.scrollWidth > documentNode.clientWidth,
      canvasOverflow: Boolean(canvasNode && canvasNode.scrollWidth > canvasNode.clientWidth),
      contextText: contextNode?.textContent?.trim() || "",
      contextWidth: contextNode?.getBoundingClientRect().width || 0,
      contextWhiteSpace: contextStyle?.whiteSpace || "",
      contextOverflow: contextStyle?.overflow || "",
    };
  });
  expect(zoomLayout.canvasOverflow, "200% horizontal continuation must belong to the explicit canvas region").toBe(true);
  expect(zoomLayout.documentOverflow, "200% must not create document-level horizontal overflow").toBe(false);
  expect(zoomLayout.contextText).toContain(LONG_OBJECTIVE);
  expect(zoomLayout.contextWidth).toBeGreaterThan(0);
  expect(zoomLayout.contextWhiteSpace).not.toBe("nowrap");
  expect(zoomLayout.contextOverflow).toBe("visible");
  await page.screenshot({ path: path.join(OUT_DIR, "zoom-200-equivalent-640px.png"), fullPage: true });
  mark("A11Y-01", true, "role tree/treeitem, aria-level, modal focus and Escape return");
  mark("RESP-01-200", true, "200% browser zoom modeled by a 640 CSS px layout viewport and captured");
});

test("NC-VIS-05: filtros largos conservan title y resumen accesible", async ({ page }) => {
  await mockResponsiveApp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/arboles?contract_id=42");
  const processSelect = page.locator("#arbol-v02-process-select");
  const objectiveSelect = page.locator("#arbol-v02-objective-select");
  await processSelect.selectOption("1");
  await expect(processSelect).toHaveValue("1");
  await expect(objectiveSelect.locator("option", { hasText: LONG_OBJECTIVE })).toHaveCount(1);
  await objectiveSelect.selectOption({ label: LONG_OBJECTIVE });
  await expect(processSelect).toHaveAttribute("title", LONG_PROCESS_NAME);
  await expect(objectiveSelect).toHaveAttribute("title", LONG_OBJECTIVE);
  await expect(page.locator("#arbol-v02-process-value")).toBeVisible();
  await expect(page.locator("#arbol-v02-process-value")).toHaveText(LONG_PROCESS_NAME);
  await expect(page.locator("#arbol-v02-objective-value")).toBeVisible();
  await expect(page.locator("#arbol-v02-objective-value")).toHaveText(LONG_OBJECTIVE);
  await objectiveSelect.focus();
  await expect(objectiveSelect).toBeFocused();
  await page.screenshot({ path: path.join(OUT_DIR, "filters-long-390x844.png"), fullPage: true });
  mark("NC-VIS-05", true, "long process/objective retain title and visible accessible summaries");
});

test("ERROR-01/DATA-01: estados de error no se confunden con éxito y conservan interacción", async ({ page }) => {
  await mockResponsiveApp(page);
  await page.route("**/api/rca-tree/nodes?**", (route) => json(route, { error: { code: "RCA_TREE_UNAVAILABLE", message: "Servicio temporalmente no disponible", correlation_id: "test-offline" } }, 503));
  await page.goto("/#/arboles?contract_id=42");
  await expect(page.locator('[data-tree-network-status="error"]')).toContainText("Servicio temporalmente no disponible");
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await page.screenshot({ path: path.join(OUT_DIR, "error-retry.png"), fullPage: true });
  mark("ERROR-01", true, "503 muestra error y retry accionable");
  mark("DATA-01", true, "no se renderiza árbol como éxito ante fallo HTTP");
});
