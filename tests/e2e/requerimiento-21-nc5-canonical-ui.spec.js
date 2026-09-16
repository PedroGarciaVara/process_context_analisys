import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseURL = (process.env.UI_TEST_BASE_URL || "http://127.0.0.1:8050").replace(/\/$/, "");
const operationId = "bcb6016f-5352-5d63-9559-82434215e1c3"; // R12_BU_EVACUACION
const processId = "abfead18-386d-4f27-9957-4b24da26716d";
const out = path.join(process.env.E2E_ARTIFACTS_DIR || ".playwright-artifacts/test-results", process.env.E2E_REQ21_RUN_DIR || `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-req21-nc5`);
const acResults = Object.fromEntries(["AC-21-02", "AC-21-13", "AC-21-14", "AC-21-15", "AC-21-16", "AC-21-17"].map((id) => [id, { passed: false, detail: "No probado" }]));
const consoleLines = [], requestFailures = [], responseErrors = [], expectedRejections = [];
const api = (p) => `${baseURL}${p}`;
async function getCanonical(request) { return request.get(api(`/api/bpm/operations/${operationId}/machines?process_id=${processId}`)); }
async function setCanonical(request, ids) { return request.put(api(`/api/bpm/operations/${operationId}/machines`), { data: { process_id: processId, machine_ids: ids } }); }
function noLegacy(value) {
  if (Array.isArray(value)) return value.every(noLegacy);
  if (!value || typeof value !== "object") return true;
  if (Object.prototype.hasOwnProperty.call(value, "equipment") || Object.prototype.hasOwnProperty.call(value, "operation_machine_assignments")) return false;
  if (value.canonical_ids && Object.prototype.hasOwnProperty.call(value.canonical_ids, "maquina_ids")) return false;
  return Object.values(value).every(noLegacy);
}
async function record(id, passed, detail) {
  acResults[id] = { passed: Boolean(passed), detail };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "ac-results.json"), JSON.stringify(acResults, null, 2));
}

test.describe("req21 AMD-21-001 · canonical operation machines", () => {
  test.setTimeout(120000);
  test.beforeAll(() => fs.mkdirSync(out, { recursive: true }));
  test.beforeEach(({ page }) => {
    page.on("console", (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
    page.on("requestfailed", (r) => requestFailures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText || "failed"}`));
    page.on("response", (r) => { if (r.status() >= 400) responseErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  });
  test.afterAll(() => {
    fs.writeFileSync(path.join(out, "console.log"), consoleLines.join("\n"));
    fs.writeFileSync(path.join(out, "request-failures.log"), requestFailures.join("\n"));
    fs.writeFileSync(path.join(out, "response-errors.log"), responseErrors.join("\n"));
    fs.writeFileSync(path.join(out, "expected-rejections.json"), JSON.stringify(expectedRejections, null, 2));
    const vals = Object.values(acResults);
    fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ run_folder: path.basename(out), pass: vals.filter((x) => x.passed).length, fail: vals.filter((x) => !x.passed).length, skip: 0, total: vals.length, ac_results: acResults }, null, 2));
  });

  test("AC-21-02/13..17 stable canonical API and UI round trip", async ({ page, request }) => {
    let finalState;
    try {
      const initial = await getCanonical(request); expect(initial.status()).toBe(200);
      const initialBody = await initial.json();
      expect(initialBody.data.machineIds).toEqual([13]);
      expect(initialBody.data.catalog).toEqual(expect.arrayContaining([{ id: 13, name: "EV01" }, { id: 14, name: "EV02" }]));
      expect(noLegacy(initialBody)).toBeTruthy();
      const metadata = await request.get(api(`/api/bpm/nodes/${operationId}/metadata`));
      expect(metadata.status()).toBe(200); expect(noLegacy(await metadata.json())).toBeTruthy();
      await record("AC-21-16", true, "Metadata y GET sin representaciones duplicadas");

      for (const data of [{ process_id: processId, equipment: ["ffff"] }, { process_id: processId, data: { equipment: ["ffff"] } }, { process_id: processId, canonical_ids: { maquina_ids: ["ffff"] } }]) {
        const bad = await request.put(api(`/api/bpm/operations/${operationId}/machines`), { data });
        const status = bad.status();
        expectedRejections.push({ payload: data, status, body: await bad.json() });
        expect(status).toBeGreaterThanOrEqual(400); expect(status).toBeLessThan(500);
      }
      expect((await (await getCanonical(request)).json()).data.machineIds).toEqual([13]);
      await record("AC-21-13", true, "Payload legacy/ffff rechazado con 4xx y sin mutación");
      const mixed = await setCanonical(request, [13, 999999]);
      const mixedStatus = mixed.status();
      expectedRejections.push({ payload: { process_id: processId, machine_ids: [13, 999999] }, status: mixedStatus, body: await mixed.json() });
      expect(mixedStatus).toBeGreaterThanOrEqual(400); expect(mixedStatus).toBeLessThan(500);
      expect((await (await getCanonical(request)).json()).data.machineIds).toEqual([13]);
      await record("AC-21-15", true, "Conjunto mixto inválido rechazado atómicamente");

      await page.goto(`${baseURL}/#/operaciones_detalle?process_id=${processId}&node_id=${operationId}`);
      await expect(page.locator("#operation-detail-form")).toBeVisible();
      await expect(page.locator('input[data-operation-machine][value="13"]')).toBeChecked();
      await expect(page.locator('input[data-operation-machine][value="14"]')).not.toBeChecked();
      await expect(page.locator("#operation-detail-form")).not.toContainText(/Equipos/i);
      await expect(page.locator('[data-operation-equipment], [name="equipment"], textarea[name*="equipment" i]')).toHaveCount(0);
      await page.locator('input[data-operation-machine][value="14"]').check();
      await page.locator("#operation-detail-save").click();
      await expect(page.locator("#operation-detail-alert")).toContainText(/guardad|actualiz|éxito/i);
      await page.reload();
      await expect(page.locator('input[data-operation-machine][value="13"]')).toBeChecked();
      await expect(page.locator('input[data-operation-machine][value="14"]')).toBeChecked();
      expect((await (await getCanonical(request)).json()).data.machineIds).toEqual([13, 14]);
      await page.locator('input[data-operation-machine][value="14"]').uncheck();
      await page.locator("#operation-detail-save").click();
      await expect(page.locator("#operation-detail-alert")).toContainText(/guardad|actualiz|éxito/i);
      await page.reload();
      await expect(page.locator('input[data-operation-machine][value="13"]')).toBeChecked();
      await expect(page.locator('input[data-operation-machine][value="14"]')).not.toBeChecked();
      finalState = (await (await getCanonical(request)).json()).data.machineIds;
      expect(finalState).toEqual([13]);
      const rightPanel = page.locator("[data-shell-right]");
      await expect(rightPanel).toContainText("Máquinas asociadas");
      await expect(rightPanel).toContainText("EV01");
      await expect(rightPanel).not.toContainText("EV02");
      await page.goto(`${baseURL}/#/operaciones?process_id=${processId}`);
      const exactRow = page.locator("tbody tr").filter({ hasText: "R12_BU_EVACUACION" }).first();
      await expect(exactRow).toBeVisible();
      const machineCell = exactRow.locator("td").nth(4);
      await expect(machineCell).toContainText("EV01");
      await expect(machineCell).not.toContainText("EV02");
      await page.screenshot({ path: path.join(out, "AC-21-14-canonical-final.png"), fullPage: true });
      await record("AC-21-02", true, "UI selecciona IDs canónicos y persiste tras reload");
      await record("AC-21-14", true, "UI add/remove EV02 y API final exactamente EV01");
      const reconciliation = JSON.parse(fs.readFileSync(process.env.REQ21_RECON_EVIDENCE, "utf8"));
      expect(reconciliation.forbidden_metadata_occurrences).toBe(0);
      expect(reconciliation.canonical_duplicate_keys).toBe(0);
      expect(reconciliation.final_machine_ids).toEqual([13]);
      await record("AC-21-17", true, "DB reconciliation evidence: zero forbidden metadata/duplicate keys; UI round-trip verified separately");
    } catch (error) {
      await record("AC-21-02", false, String(error));
      throw error;
    } finally {
      const cleanup = await setCanonical(request, [13]);
      finalState = (await (await getCanonical(request)).json()).data.machineIds;
      fs.writeFileSync(path.join(out, "cleanup-state.json"), JSON.stringify({ cleanup_status: cleanup.status(), final_machine_ids: finalState }, null, 2));
      expect(finalState).toEqual([13]);
    }
  });
});
