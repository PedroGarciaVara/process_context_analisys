import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const evidenceDir = path.join(".playwright-artifacts", "creation-inline-feedback", runId);

const detail = ({ causeId = null, hypotheses = [] } = {}) => ({
  causa_id: causeId,
  cause: causeId ? { id: causeId, nombre: "Causa simulada", tipo: "causa", categoria: "Test", descripcion: "Fixture" } : null,
  cause_form: { nombre: causeId ? "Causa simulada" : "", tipo: "causa", categoria: causeId ? "Test" : "", descripcion: causeId ? "Fixture" : "" },
  context_items: [{ label: "Contrato", value: "#2" }],
  context_message: "Detalle listo para edicion.",
  contract_id: 2,
  hipotesis: null,
  hipotesis_id: null,
  hypotheses,
  hypothesis_form: { nombre: "", descripcion: "", criterio_validacion: "", metodo: "" },
  labels: { cause_save: causeId ? "Actualizar causa" : "Crear causa hija", hypothesis_save: "Guardar hipotesis" },
  mode: causeId ? "edit_cause" : "new_child",
  parent_id: causeId ? null : 45,
  ready: true,
});

async function installMocks(page, { causePostStatus = 201, causePostDelay = 0 } = {}) {
  let createdCauseId = null;
  let createdHypothesis = false;
  await page.route("**/api/rca-tree/causes/detail**", async (route) => {
    const url = new URL(route.request().url());
    const causeId = url.searchParams.get("causa_id") || createdCauseId;
    await route.fulfill({ json: detail({ causeId: causeId ? Number(causeId) : null, hypotheses: createdHypothesis ? [{ id: 901, nombre: "Hipótesis simulada", descripcion: "Fixture", criterio_validacion: "Fixture", metodo: "Fixture" }] : [] }) });
  });
  await page.route("**/api/rca-tree/causes", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    if (causePostDelay) await new Promise((resolve) => setTimeout(resolve, causePostDelay));
    if (causePostStatus >= 400) return route.fulfill({ status: causePostStatus, contentType: "application/json", body: JSON.stringify({ detail: "Creación simulada rechazada" }) });
    createdCauseId = 901;
    return route.fulfill({ status: 201, json: { message: "Causa simulada creada", cause: { id: createdCauseId, contrato_id: 2 } } });
  });
  await page.route("**/api/rca-tree/causes/901/hypotheses", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    createdHypothesis = true;
    return route.fulfill({ status: 201, json: { message: "Hipótesis simulada creada", hypothesis: { id: 901 } } });
  });
}

test.beforeEach(() => fs.mkdirSync(evidenceDir, { recursive: true }));

test("shows cause and hypothesis creation confirmations only after mocked refresh", async ({ page }) => {
  await installMocks(page);
  await page.goto("/#/causa_detalle?contrato_id=2&parent_id=45");
  await expect(page.locator("#cd-cause-save")).toHaveText("Crear causa hija");
  await page.locator("#cd-cause-name").fill("Causa simulada");
  await page.locator("#cd-cause-save").click();
  await expect(page.locator("#cd-cause-creation-feedback")).toHaveText("Causa creada");
  await expect(page.locator("#cd-cause-creation-feedback")).toHaveAttribute("role", "status");
  await expect(page.locator("#cd-cause-creation-feedback")).toHaveAttribute("aria-live", "polite");
  await page.screenshot({ path: path.join(evidenceDir, "01-cause-created.png"), fullPage: true });

  await page.locator("#cd-hypothesis-title").fill("Hipótesis simulada");
  await page.locator("#cd-hypothesis-description").fill("Fixture");
  await page.locator("#cd-hypothesis-save").click();
  await expect(page.locator("#cd-hypothesis-creation-feedback")).toHaveText("Hipótesis creada");
  await page.screenshot({ path: path.join(evidenceDir, "02-hypothesis-created.png"), fullPage: true });

  fs.writeFileSync(path.join(evidenceDir, "summary.json"), JSON.stringify({ cause: "Causa creada", hypothesis: "Hipótesis creada", writesPerformed: false }, null, 2));
});

test("does not show cause confirmation when mocked API creation fails", async ({ page }) => {
  await installMocks(page, { causePostStatus: 500 });
  await page.goto("/#/causa_detalle?contrato_id=2&parent_id=45");
  await page.locator("#cd-cause-name").fill("Causa rechazada");
  await page.locator("#cd-cause-save").click();
  await expect(page.locator("#cd-alert")).toContainText("Request failed: 500");
  await expect(page.locator("#cd-cause-creation-feedback")).toBeHidden();
  await page.screenshot({ path: path.join(evidenceDir, "03-cause-error-no-confirmation.png"), fullPage: true });
  fs.writeFileSync(path.join(evidenceDir, "error-summary.json"), JSON.stringify({ causeFeedbackVisible: false, writesPerformed: false }, null, 2));
});

test("does not resurrect confirmation when cancel/refresh starts before create resolves", async ({ page }) => {
  await installMocks(page, { causePostDelay: 350 });
  await page.goto("/#/causa_detalle?contrato_id=2&parent_id=45");
  await page.locator("#cd-cause-name").fill("Causa retardada");
  const createRequest = page.locator("#cd-cause-save").click();
  await page.locator("#cd-cause-cancel").click();
  await createRequest;
  await page.waitForTimeout(500);
  await expect(page.locator("#cd-cause-creation-feedback")).toBeHidden();
  await page.screenshot({ path: path.join(evidenceDir, "04-stale-create-no-confirmation.png"), fullPage: true });
  fs.writeFileSync(path.join(evidenceDir, "race-summary.json"), JSON.stringify({ causeFeedbackVisible: false, writesPerformed: false }, null, 2));
});
