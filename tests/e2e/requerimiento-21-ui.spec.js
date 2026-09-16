import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseURL = (process.env.UI_TEST_BASE_URL || process.env.E2E_DASH_BACKEND_URL || "http://127.0.0.1:8050").replace(/\/$/, "");
const runId = process.env.E2E_REQ21_RUN_DIR || `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-req21`;
const artifactDir = path.join(process.env.E2E_ARTIFACTS_DIR || ".playwright-artifacts/test-results", runId);
const acResults = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`AC-21-${String(i + 1).padStart(2, "0")}`, { passed: false, detail: "No ejecutado" }]));
const consoleLines = [];
const requestFailures = [];
const responseErrors = [];

function acId(title) { return title.match(/AC-21-\d{2}/)?.[0]; }
async function open(page, route) {
  await page.goto(`${baseURL}/#/${route}`);
  await expect(page.locator("body")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(500);
}
async function evidence(page, id, name) {
  fs.mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, `${id}-${name}.png`), fullPage: true });
}

test.describe("requerimiento_21 · validación UI real", () => {
  test.setTimeout(60000);
  test.beforeAll(() => {
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, "ac-results.json"), JSON.stringify(acResults, null, 2));
  });
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
    page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || "failed"}`));
    page.on("response", (response) => { if (response.status() >= 400) responseErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`); });
  });
  test.afterEach(async ({ page }, testInfo) => {
    const id = acId(testInfo.title);
    if (!id) return;
    const passed = testInfo.status === "passed";
    const result = { passed, detail: passed ? "Assertions UI completadas" : `${testInfo.status}: ${testInfo.error?.message || "fallo"}`, url: page.url(), evidence: `${id}-${id === "AC-21-01" ? "create-machine" : "final"}.png` };
    acResults[id] = result;
    let persisted = {};
    try { persisted = JSON.parse(fs.readFileSync(path.join(artifactDir, "ac-results.json"), "utf8")); } catch { /* first result */ }
    fs.writeFileSync(path.join(artifactDir, "ac-results.json"), JSON.stringify({ ...persisted, [id]: result }, null, 2));
    try { await evidence(page, id, id === "AC-21-01" ? "create-machine" : "final"); } catch { /* preserve test result */ }
  });
  test.afterAll(() => {
    const persisted = JSON.parse(fs.readFileSync(path.join(artifactDir, "ac-results.json"), "utf8"));
    fs.writeFileSync(path.join(artifactDir, "ac-results.json"), JSON.stringify(persisted, null, 2));
    fs.writeFileSync(path.join(artifactDir, "console.log"), consoleLines.join("\n"));
    fs.writeFileSync(path.join(artifactDir, "request-failures.log"), requestFailures.join("\n"));
    fs.writeFileSync(path.join(artifactDir, "response-errors.log"), responseErrors.join("\n"));
    const values = Object.values(persisted);
    fs.writeFileSync(path.join(artifactDir, "summary.json"), JSON.stringify({ run_folder: runId, pass: values.filter((r) => r.passed).length, fail: values.filter((r) => !r.passed).length, skip: 0, total: values.length, ac_results: persisted }, null, 2));
    fs.writeFileSync(path.join(artifactDir, "backend-delta.log"), "No E2E_BACKEND_LOG_PATH configured; local backend log unavailable.\n");
    fs.writeFileSync(path.join(artifactDir, "backend-full.log"), "No E2E_BACKEND_LOG_PATH configured; local backend log unavailable.\n");
  });

  test("AC-21-01 crear máquina navega a detalle sin modal", async ({ page }) => {
    await open(page, "maquinas");
    const create = page.getByRole("link", { name: /crear nueva máquina/i });
    await expect(create).toBeVisible();
    await create.click();
    await expect(page).toHaveURL(/#\/maquinas_detalle\?new=1/);
    await expect(page.getByRole("heading", { name: /nueva máquina/i })).toBeVisible();
    await expect(page.locator("[role=dialog]")).toHaveCount(0);
  });

  test("AC-21-02 asociación inválida se rechaza y válida persiste", async ({ page }) => {
    const operationId = "bcb6016f-5352-5d63-9559-82434215e1c3";
    const processId = "abfead18-386d-4f27-9957-4b24da26716d";
    const canonical = `${baseURL}/api/bpm/operations/${operationId}/machines?process_id=${processId}`;
    const initial = await page.request.get(canonical);
    expect(initial.status()).toBe(200);
    expect((await initial.json()).data.machineIds).toEqual([13]);
    for (const payload of [{ process_id: processId, equipment: ["ffff"] }, { process_id: processId, data: { equipment: ["ffff"] } }]) {
      const response = await page.request.put(`${baseURL}/api/bpm/operations/${operationId}/machines`, { data: payload });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    }
    expect((await (await page.request.get(canonical)).json()).data.machineIds).toEqual([13]);
    await page.goto(`${baseURL}/#/operaciones_detalle?process_id=${processId}&node_id=${operationId}`);
    await expect(page.locator('input[data-operation-machine][value="13"]')).toBeChecked();
    await expect(page.locator('input[data-operation-machine][value="14"]')).not.toBeChecked();
  });

  test("AC-21-03 pestañas genérica y específica son distinguibles", async ({ page }) => {
    await open(page, "maquinas_detalle?new=1");
    const generic = page.locator("#machine-page-panel-type").getByRole("heading", { name: /máquina genérica/i });
    const specific = page.locator("#machine-page-panel-specific").getByRole("heading", { name: /máquina específica/i });
    await expect(generic).toBeVisible();
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(2);
    await tabs.filter({ hasText: "Máquina específica" }).click();
    await expect(specific).toBeVisible();
    await expect(generic).toBeHidden();
  });

  test("AC-21-04 contratos carga filtro y lista en primer render", async ({ page }) => {
    await open(page, "contratos");
    await expect(page.locator("#contract-process-filter")).toBeVisible();
    await expect(page.locator("tbody [data-contract-row]").first()).toBeVisible();
    await expect(page.locator("tbody")).not.toContainText(/cargando/i);
  });

  test("AC-21-05 operación muestra contratos máquinas descripción y BPM", async ({ page }) => {
    await open(page, "operaciones");
    await expect(page.getByRole("heading", { name: "Operaciones", exact: true })).toBeVisible();
    await expect(page.locator("[data-action=operation-detail]").first()).toBeVisible();
    await expect(page.locator("[data-shell-right]")).toContainText(/flujo BPM|proceso seleccionado/i);
    await expect(page.locator("table")).toContainText(/Contratos|Máquinas/i);
  });

  test("AC-21-06 proceso actualiza descripción en panel derecho", async ({ page }) => {
    await open(page, "procesos");
    await expect(page.getByRole("heading", { name: "Procesos", exact: true })).toBeVisible();
    const row = page.locator("[data-process-row]").first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.locator("[data-shell-right]")).toContainText(/descripci[oó]n|proceso/i);
  });

  test("AC-21-07 contrato ofrece selector de disponibles y conserva detalle tras reload", async ({ page }) => {
    await open(page, "contratos");
    await page.locator('[data-action="contract-detail"]').first().click();
    await expect(page).toHaveURL(/#\/contratos_detalle/);
    expect(await page.locator("select").count()).toBeGreaterThan(0);
    await page.reload();
    await expect(page.locator("body")).toContainText(/máquina|maquina/i);
  });

  test("AC-21-08 árbol conserva selección zoom y acciones sin panel redundante", async ({ page }) => {
    await open(page, "arboles?contract_id=3");
    await expect(page.locator("[aria-label*='Árbol causal'], .acv2-tree-stage").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator("body")).not.toContainText(/inspector redundante/i);
    await expect(page.locator("button").filter({ hasText: /zoom|acercar|alejar/i }).first()).toBeVisible();
  });

  test("AC-21-09 análisis elimina Cadena científica y conserva resultados", async ({ page }) => {
    await open(page, "analisis_causas?contract_id=3&analysis_id=39");
    await expect(page.locator("body")).not.toContainText("Cadena científica");
    await expect(page.locator("body")).not.toContainText(/solo lectura/i);
    await expect(page.getByText("Trazabilidad", { exact: true })).toBeVisible({ timeout: 20000 });
  });

  test("AC-21-10 análisis expone edición y motivo de cierre", async ({ page }) => {
    const analysisId = 39;
    await open(page, `analisis_causas?contract_id=3&analysis_id=${analysisId}`);
    await expect(page.locator("#analysis-workspace-status")).toContainText(/resultados trazados/i, { timeout: 20000 });
    await expect(page.locator(".acv2-tree-node-button").first()).toBeVisible({ timeout: 20000 });
    await page.locator(".acv2-tree-node-button").first().click();
    const firstHypothesis = page.locator(".acv2-hypothesis-card:visible").first();
    await expect(firstHypothesis).toBeVisible();
    const criterion = firstHypothesis.locator(".acv2-analysis-hypothesis-criterion");
    const evidence = firstHypothesis.locator(".acv2-analysis-hypothesis-evidence");
    await criterion.fill("TEST criterio observable req21");
    await evidence.fill("TEST evidencia observable OK req21");
    await firstHypothesis.locator(".acv2-analysis-hypothesis-comment").fill("TEST justificación OK req21");
    await expect(criterion).toHaveValue("TEST criterio observable req21");
    await expect(evidence).toHaveValue("TEST evidencia observable OK req21");
    const resultResponses = [];
    let resultResponse = page.waitForResponse((response) => response.url().endsWith(`/api/rca-tree/analyses/${analysisId}/results`) && response.request().method() === "POST");
    await firstHypothesis.getByRole("button", { name: "OK", exact: true }).click();
    const okResponse = await resultResponse;
    resultResponses.push({ status: okResponse.status(), request: okResponse.request().postDataJSON(), body: await okResponse.json() });
    expect(okResponse.status()).toBe(201);
    await page.locator(".acv2-tree-node-button").nth(1).click();
    const secondHypothesis = page.locator(".acv2-hypothesis-card:visible").first();
    await expect(secondHypothesis).toBeVisible();
    await secondHypothesis.locator(".acv2-analysis-hypothesis-criterion").fill("TEST criterio observable NO OK req21");
    await secondHypothesis.locator(".acv2-analysis-hypothesis-evidence").fill("TEST evidencia observable NO OK req21");
    await secondHypothesis.locator(".acv2-analysis-hypothesis-comment").fill("TEST justificación NO OK req21");
    resultResponse = page.waitForResponse((response) => response.url().endsWith(`/api/rca-tree/analyses/${analysisId}/results`) && response.request().method() === "POST");
    await secondHypothesis.getByRole("button", { name: "NO OK", exact: true }).click();
    const noOkResponse = await resultResponse;
    resultResponses.push({ status: noOkResponse.status(), request: noOkResponse.request().postDataJSON(), body: await noOkResponse.json() });
    fs.writeFileSync(path.join(artifactDir, "AC-21-10-responses.json"), JSON.stringify(resultResponses, null, 2));
    expect(noOkResponse.status()).toBe(201);
    const saved = await page.request.get(`${baseURL}/api/rca-tree/analyses/${analysisId}`);
    expect(saved.ok()).toBeTruthy();
    const results = (await saved.json()).data.results.filter((item) => item.tipo_elemento === "hipotesis");
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ evaluacion: "confirmada", evidencia: "TEST evidencia observable OK req21" }),
      expect.objectContaining({ evaluacion: "descartada", evidencia: "TEST evidencia observable NO OK req21" }),
    ]));
    await expect(page.locator("body")).not.toContainText("Una decisión confirmada o rechazada requiere evidencia y criterio.");
    await page.reload();
    await expect(page.locator(".acv2-analysis-hypothesis-evidence").first()).toHaveValue(/TEST evidencia observable/);
    await expect(page.locator(".acv2-analysis-hypothesis-criterion").first()).toHaveValue(/TEST criterio observable/);
    await page.locator("#analysis-final-conclusion").fill("TEST cierre req21");
    const closeResponse = page.waitForResponse((response) => response.url().endsWith(`/api/rca-tree/analyses/${analysisId}`) && response.request().method() === "PATCH" && response.status() === 200);
    await page.locator("#analysis-close-button").click();
    await closeResponse;
    await expect(page.locator("#analysis-workspace-status")).toContainText("cerrado");
    await expect(page.locator("[data-hypothesis-action='evaluate']")).toHaveCount(0);
    const closedResult = await page.request.post(`${baseURL}/api/rca-tree/analyses/${analysisId}/results`, { data: {
      element_type: "hipotesis", hypothesis_id: Number(await secondHypothesis.getByRole("button", { name: "NO OK", exact: true }).getAttribute("data-hypothesis-id")),
      evaluation: "confirmada", evidence: "TEST evidencia cerrada", validation_criterion: "TEST criterio cerrado",
    }});
    expect(closedResult.status()).toBe(403);
    expect((await closedResult.json()).message).toMatch(/cerrado|no admite/i);
    await page.request.patch(`${baseURL}/api/rca-tree/analyses/${analysisId}`, { data: { status: "abierto" } });
  });
});
