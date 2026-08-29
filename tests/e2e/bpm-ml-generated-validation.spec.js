import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const TARGET_PROCESS = "PROCESO_ML_FABRICACION";
const REQUIRED_CODES = [
  "INPUT_ML",
  "BU_APROV",
  "CARGAS_DOSIF",
  "MI_MEZCLADO",
  "HA_HOMOALIMENTADOR",
  "OUTPUT_MEZCLA",
  "DESECHO_MATERIAL",
];
const ARTIFACTS_ROOT = process.env.E2E_ARTIFACTS_DIR || ".playwright-artifacts/test-results";
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT_DIR = path.join(ARTIFACTS_ROOT, `${RUN_ID}-bpm-ml-generated`);
const results = [];
const consoleLines = [];
const requestFailures = [];

function writeJson(name, value) {
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(value, null, 2), "utf8");
}

function writeText(name, value) {
  fs.writeFileSync(path.join(OUT_DIR, name), value, "utf8");
}

async function geometry(page) {
  return page.locator(".pm-bpm").evaluate((diagram) => {
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const cards = [...diagram.querySelectorAll(".pm-flow-nodes > .pm-bpm-card")].map((card) => ({
      code: card.querySelector(".pm-card-title")?.textContent?.trim(),
      type: card.dataset.pmNodeType,
      box: rect(card),
    }));
    const overlaps = [];
    for (let i = 0; i < cards.length; i += 1) for (let j = i + 1; j < cards.length; j += 1) {
      const a = cards[i].box;
      const b = cards[j].box;
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps.push([cards[i].code, cards[j].code]);
    }
    const edges = [...diagram.querySelectorAll(".pm-edge")].map((edge) => edge.dataset.pmEdge);
    const viewport = diagram.querySelector(".pm-flow-scroll");
    const flow = diagram.querySelector(".pm-flow");
    const editor = document.querySelector(".pm-editor");
    const palette = document.querySelector(".pm-node-palette");
    const metadata = document.querySelector(".pm-metadata-panel");
    return {
      cards,
      edges,
      overlaps,
      viewport: { ...rect(viewport), scrollWidth: viewport.scrollWidth, scrollHeight: viewport.scrollHeight, clientWidth: viewport.clientWidth, clientHeight: viewport.clientHeight },
      flow: rect(flow),
      editor: rect(editor),
      palette: rect(palette),
      metadata: metadata ? rect(metadata) : null,
      document: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
    };
  });
}

async function validateAtViewport(page, viewportName) {
  const catalogResponse = page.waitForResponse((response) => response.url().endsWith("/api/bpm/processes") && response.request().method() === "GET");
  await page.goto("/index.html#/modelado-procesos");
  const catalogPayload = await (await catalogResponse).json();
  const process = (catalogPayload.data || []).find((item) => item.process_code === TARGET_PROCESS);
  expect(process, `El catálogo debe contener ${TARGET_PROCESS}`).toBeTruthy();
  await page.locator("#pm-process-selector").selectOption(process.process_id);
  await expect(page.locator(".pm-bpm")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".pm-editor-head")).toBeVisible().catch(() => {});
  await expect.poll(() => page.url(), { timeout: 10_000 }).toContain(`process_id=${process.process_id}`);

  const codes = await page.locator(".pm-bpm .pm-card-title").allTextContents();
  const edgeCount = await page.locator(".pm-bpm .pm-edge").count();
  const metrics = await geometry(page);
  const visibleCodes = new Set(codes.map((code) => code.trim()));
  expect(codes, "Deben existir exactamente 12 tarjetas BPM").toHaveLength(12);
  expect(edgeCount, "Deben existir exactamente 17 transiciones visibles").toBe(17);
  for (const code of REQUIRED_CODES) expect(visibleCodes.has(code), `Debe verse el nodo ${code}`).toBeTruthy();
  expect(metrics.overlaps, "No debe haber solapamiento entre tarjetas").toEqual([]);
  expect(metrics.flow.width, "El canvas debe conservar anchura para scroll horizontal").toBeGreaterThan(metrics.viewport.width);
  expect(metrics.document.scrollWidth, "El canvas no debe desbordar horizontalmente el documento").toBeLessThanOrEqual(metrics.document.clientWidth + 2);
  expect(metrics.palette.right, "La paleta no debe invadir el editor").toBeLessThanOrEqual(metrics.editor.left + 1);
  if (metrics.metadata) expect(metrics.metadata.left, "El panel derecho no debe invadir el diagrama").toBeGreaterThanOrEqual(metrics.editor.right - 1);

  await page.screenshot({ path: path.join(OUT_DIR, `${viewportName}-bpm-full.png`), fullPage: true });
  const scroll = page.locator(".pm-flow-scroll");
  await scroll.screenshot({ path: path.join(OUT_DIR, `${viewportName}-bpm-left.png`) });
  await scroll.evaluate((element) => { element.scrollLeft = Math.max(0, element.scrollWidth - element.clientWidth); });
  await page.waitForTimeout(250);
  await scroll.screenshot({ path: path.join(OUT_DIR, `${viewportName}-bpm-right.png`) });
  await scroll.evaluate((element) => { element.scrollLeft = Math.round((element.scrollWidth - element.clientWidth) / 2); });
  await page.waitForTimeout(250);
  await scroll.screenshot({ path: path.join(OUT_DIR, `${viewportName}-bpm-center.png`) });
  writeJson(`${viewportName}-dom-metrics.json`, { viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })), catalogProcess: process, codes, edgeCount, metrics });
  results.push({ viewport: viewportName, passed: true, codes, edgeCount, metrics });
}

test.describe("BPM ML generado: catálogo y modelado", () => {
  test.beforeAll(() => fs.mkdirSync(OUT_DIR, { recursive: true }));
  test.beforeEach(async ({ page }) => {
    page.on("console", (message) => consoleLines.push(`[${message.type()}] ${message.text()}`));
    page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}`));
  });
  test.afterAll(() => {
    writeJson("summary.json", { status: results.length === 2 && results.every((item) => item.passed) ? "passed" : "failed", targetProcess: TARGET_PROCESS, results, requestFailures });
    writeText("console.log", consoleLines.join("\n") + "\n");
    writeText("request-failures.log", requestFailures.join("\n") + "\n");
  });

  test("1280x900: localiza el BPM desde catálogo y abre modelado", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await validateAtViewport(page, "1280x900");
  });

  test("1920x1080: localiza el BPM desde catálogo y abre modelado", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await validateAtViewport(page, "1920x1080");
  });
});
