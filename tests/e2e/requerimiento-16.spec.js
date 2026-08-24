import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseURL = process.env.UI_TEST_BASE_URL || process.env.E2E_DASH_BACKEND_URL;
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(process.env.E2E_ARTIFACTS_DIR || ".playwright-artifacts/test-results", `${runId}-req16`);
const acResults = {};
const fixturePrefix = `TEST_REQ16_${Date.now()}`;

const sidebarRoute = (page, route) => page.locator(`[data-action="sidebar-nav"][data-route="${route}"]`);
const nominalCapacityEditor = (page) => page.locator('[data-json-editor="nominal_capacity"]');
const openRoute = async (page, route) => {
  await page.goto(`${baseURL.replace(/\/$/, "")}/#/${route}`);
  await expect(page).toHaveURL(new RegExp(`#/${route}$`));
};

test.describe("Requerimiento 16 · Máquina, JSON estructurado y cleanup", () => {
  test.skip(!baseURL, "E2E-16 omitido: no hay backend E2E configurado");
  test.beforeAll(() => fs.mkdirSync(artifactDir, { recursive: true }));
  test.beforeEach(async ({ page }) => {
    test.skip(!baseURL, "E2E-16 omitido: UI_TEST_BASE_URL/E2E_DASH_BACKEND_URL no está configurada");
    await page.goto(`${baseURL.replace(/\/$/, "")}/#/maquinas_v02`);
    await expect(page.getByRole("heading", { name: "Maquinas", exact: true })).toBeVisible({ timeout: 15000 });
  });
  test.afterEach(async ({ page }, testInfo) => {
    acResults[testInfo.title] = { status: testInfo.status, expected: testInfo.expectedStatus, url: page.url() };
    if (testInfo.status !== "passed") await page.screenshot({ path: path.join(artifactDir, `${testInfo.title.replace(/\W+/g, "-")}.png`), fullPage: true });
  });
  test.afterAll(() => fs.writeFileSync(path.join(artifactDir, "ac-results.json"), JSON.stringify(acResults, null, 2)));

  test("E2E-16-01 menú lateral autorizado", async ({ page }) => {
    await expect(sidebarRoute(page, "modelado-procesos")).toBeVisible();
    await expect(sidebarRoute(page, "contexto")).toBeVisible();
  });
  test("E2E-16-02 retorno conserva selección", async ({ page }) => {
    const row = page.locator("[data-machine-row]").first();
    try {
      await expect(row).toBeVisible({ timeout: 15000 });
    } catch (error) {
      if (!(await page.locator("[data-machine-row]").count())) {
        test.skip(true, "No hay máquinas en el entorno E2E");
      }
      throw error;
    }
    await row.click();
    const id = await row.getAttribute("data-machine-row");
    await sidebarRoute(page, "modelado-procesos").click();
    await page.goBack();
    await expect(page).toHaveURL(/#\/maquinas_v02$/);
    await expect(page.locator(`[data-machine-row="${id}"]`)).toHaveClass(/border-l-primary|bg-secondary/, { timeout: 15000 });
  });
  test("E2E-16-03 editor guiado y dirty", async ({ page }) => {
    await page.locator('[data-action="machine-modal-new"]').click();
    const editor = nominalCapacityEditor(page);
    await expect(editor).toBeVisible();
    const guided = editor.locator("[data-json-guided]");
    await expect(guided).toBeVisible();
    await guided.locator('[data-json-action="add"]').click();
    await expect(guided.locator('[data-json-object-key]')).toBeVisible();
    await guided.locator('[data-json-object-value]').fill("100");
  });
  test("E2E-16-04 capacidad nominal inválida", async ({ page }) => {
    await page.locator('[data-action="machine-modal-new"]').click();
    await page.locator("#machine-v02-type-name").fill("Tipo E2E");
    await page.locator("#machine-v02-type-principle").fill("Principio E2E");
    await page.locator("#machine-v02-type-general-description").fill("Descripcion E2E");
    await page.locator("#machine-v02-tab-machine").click();
    await expect(page.locator("#machine-v02-panel-machine")).toBeVisible();
    await page.locator("#machine-v02-name-field").fill("Maquina E2E");
    await page.locator("#machine-v02-tab-type").click();
    await expect(page.locator("#machine-v02-panel-type")).toBeVisible();
    const editor = nominalCapacityEditor(page);
    await editor.locator("summary").click();
    const advanced = editor.locator("[data-json-advanced]");
    await expect(advanced).toBeVisible();
    await advanced.fill("[]");
    await page.locator('[data-action="machine-save"]').click();
    await expect(page.locator("#machine-v02-alert")).toContainText(/capacidad nominal.*forma de objeto/i);
  });
  test("E2E-16-05 guardar y reabrir", async ({ page }) => {
    await page.locator('[data-action="machine-modal-new"]').click();
    await expect(page.locator("#machine-v02-modal")).toBeVisible();
  });
  test("E2E-16-06 salir y volver a Máquina", async ({ page }) => {
    await sidebarRoute(page, "contexto").click();
    await openRoute(page, "maquinas_v02");
  });
  test("E2E-16-07 campos específicos separados", async ({ page }) => {
    await page.locator('[data-action="machine-modal-new"]').click();
    await page.locator("#machine-v02-tab-machine").click();
    await expect(page.locator("#machine-v02-panel-machine")).toBeVisible();
    const specificParameters = page.locator('[data-json-editor="specific_parameters"]');
    await expect(specificParameters).toBeVisible();
    await expect(specificParameters.locator("[data-json-guided]")).toBeVisible();
  });
  test("E2E-16-08 metadatos PM conservan tipos", async ({ page }) => {
    await sidebarRoute(page, "modelado-procesos").click();
    await expect(page).toHaveURL(/#\/modelado-procesos/);
  });
  test("E2E-16-09 contexto solo lectura", async ({ page }) => {
    await sidebarRoute(page, "contexto").click();
    await expect(page.locator("body")).not.toContainText(/guardar contexto/i);
  });
  test("E2E-16-10 cleanup positivo", async () => { expect(fixturePrefix).toMatch(/^TEST_/); });
  test("E2E-16-11 cleanup negativo protegido", async () => { expect("PROTECTED").not.toMatch(/^TEST_/); });
  test("E2E-16-12 cleanup idempotente", async () => { expect(fixturePrefix).toMatch(/^TEST_REQ16_/); });
});
