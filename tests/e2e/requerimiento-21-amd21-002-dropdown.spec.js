import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseURL = (process.env.UI_TEST_BASE_URL || "http://127.0.0.1:8050").replace(/\/$/, "");
const processId = "abfead18-386d-4f27-9957-4b24da26716d";
const operationId = "bcb6016f-5352-5d63-9559-82434215e1c3";
const runDir = process.env.E2E_REQ21_RUN_DIR || `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-req21-amd21-002`;
const out = path.join(process.env.E2E_ARTIFACTS_DIR || ".playwright-artifacts/test-results", runDir);
const ids = ["AC-21-18", "AC-21-19", "AC-21-20", "AC-21-21", "AC-21-22", "AC-21-23"];
const acResults = Object.fromEntries(ids.map((id) => [id, { passed: false, detail: "No probado" }]));
const consoleLines = [], requestFailures = [], responseErrors = [], networkEvidence = [];
const canonicalUrl = `${baseURL}/api/bpm/operations/${operationId}/machines?process_id=${processId}`;
const record = (id, passed, detail, evidence = []) => {
  acResults[id] = { passed: Boolean(passed), detail, evidence };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "ac-results.json"), JSON.stringify(acResults, null, 2));
};
const canonical = async (request) => {
  const response = await request.get(canonicalUrl);
  const body = await response.json();
  networkEvidence.push({ method: "GET", url: canonicalUrl, status: response.status(), body });
  return { response, body };
};
const replace = async (request, machineIds) => {
  const payload = { process_id: processId, machine_ids: machineIds };
  const response = await request.put(`${baseURL}/api/bpm/operations/${operationId}/machines`, { data: payload });
  let body; try { body = await response.json(); } catch { body = {}; }
  networkEvidence.push({ method: "PUT", url: `${baseURL}/api/bpm/operations/${operationId}/machines`, status: response.status(), payload, body });
  return { response, body };
};

test.describe("AMD-21-002 · selector de máquinas de operación", () => {
  test.setTimeout(120000);
  test.beforeAll(() => { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, "ac-results.json"), JSON.stringify(acResults, null, 2)); });
  test.beforeEach(({ page }) => {
    page.on("console", (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
    page.on("requestfailed", (r) => requestFailures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText || "failed"}`));
    page.on("response", (r) => { if (r.status() >= 400) responseErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  });
  test.afterAll(() => {
    fs.writeFileSync(path.join(out, "console.log"), consoleLines.join("\n"));
    fs.writeFileSync(path.join(out, "request-failures.log"), requestFailures.join("\n"));
    fs.writeFileSync(path.join(out, "response-errors.log"), responseErrors.join("\n"));
    fs.writeFileSync(path.join(out, "network-evidence.json"), JSON.stringify(networkEvidence, null, 2));
    const values = Object.values(acResults);
    fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ run_folder: runDir, pass: values.filter((x) => x.passed).length, fail: values.filter((x) => !x.passed).length, skip: 0, total: values.length, ac_results: acResults }, null, 2));
  });

  test("AC-21-18..23 dropdown acumulativo, persistencia y regresión canónica", async ({ page, request }) => {
    let original;
    try {
      const initial = await canonical(request);
      expect(initial.response.status()).toBe(200);
      original = initial.body.data.machineIds;
      const catalog = initial.body.data.catalog;
      await page.goto(`${baseURL}/#/operaciones_detalle?process_id=${processId}&node_id=${operationId}`);
      await expect(page.locator("#operation-detail-form")).toBeVisible();
      const select = page.locator("#operation-machine-select");
      const add = page.getByRole("button", { name: "Seleccionar máquina", exact: true });
      const box = page.locator("[data-operation-machine-selected]");
      const persistentControls = page.locator("[data-operation-machine-select], [data-operation-machine-add]");
      const legacyControls = page.locator("input[data-operation-machine], [data-operation-machine] input");
      const options = await select.locator("option").count();
      const initialMembers = await box.locator("[data-operation-machine-member]").count();
      const emptyVisible = initialMembers === 0 && await box.locator("[data-operation-machine-empty]").isVisible().catch(() => false);
      const noMassiveList = await legacyControls.count() === 0;
      record("AC-21-18", (await select.count()) === 1 && (await add.count()) === 1 && noMassiveList, `dropdown=${await select.count()}, boton=${await add.count()}, controles_legacy=${await legacyControls.count()}`, ["AC-21-18-dropdown.png"]);
      await page.screenshot({ path: path.join(out, "AC-21-18-dropdown.png"), fullPage: true });
      expect(await select.count()).toBe(1);
      expect(await add.count()).toBe(1);
      expect(noMassiveList).toBeTruthy();

      const candidates = catalog.filter((m) => [13, 14, 15].includes(Number(m.id))).map((m) => Number(m.id));
      expect(candidates.length).toBe(3);
      for (const id of candidates) { await select.selectOption(String(id)); await add.click(); }
      const members = await box.locator("[data-operation-machine-member]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-operation-machine-member"))));
      const uniqueMembers = [...new Set(members)];
      const optionState = await select.locator("option").evaluateAll((els) => els.filter((e) => ["13", "14", "15"].includes(e.value)).map((e) => ({ value: e.value, disabled: e.disabled, attr: e.getAttribute("disabled") })));
      const disabled = optionState.map((item) => item.disabled);
      record("AC-21-19", JSON.stringify(members.sort((a,b)=>a-b)) === JSON.stringify(candidates.sort((a,b)=>a-b)) && uniqueMembers.length === 3 && disabled.every(Boolean), `members=${members}; unique=${uniqueMembers}; option_state=${JSON.stringify(optionState)}`);
      await page.screenshot({ path: path.join(out, "AC-21-19-three-selected.png"), fullPage: true });
      expect(uniqueMembers).toHaveLength(3);
      expect(disabled.every(Boolean)).toBeTruthy();

      await box.locator(`[data-operation-machine-remove="${candidates[1]}"]`).click();
      const afterRemove = await box.locator("[data-operation-machine-member]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-operation-machine-member"))));
      await select.selectOption(String(candidates[1])); await add.click();
      const afterReadd = await box.locator("[data-operation-machine-member]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-operation-machine-member"))));
      for (const id of candidates) await box.locator(`[data-operation-machine-remove="${id}"]`).click();
      const emptyAfterDelete = await box.locator("[data-operation-machine-empty]").isVisible();
      for (const id of candidates) { await select.selectOption(String(id)); await add.click(); }
      record("AC-21-20", afterRemove.length === 2 && afterReadd.length === 3 && emptyAfterDelete, `empty_initial=${emptyVisible}; after_remove=${afterRemove}; after_readd=${afterReadd}; empty_after_delete=${emptyAfterDelete}`);
      await page.screenshot({ path: path.join(out, "AC-21-20-empty-readd.png"), fullPage: true });
      expect(afterRemove).toHaveLength(2); expect(afterReadd).toHaveLength(3);

      const hasSearchableNative = await select.getAttribute("size") === null && await select.locator("option").count() === options;
      const catalogOver100 = catalog.length > 100;
      record("AC-21-21", catalogOver100 && hasSearchableNative, `catalogo=${catalog.length}; opciones=${options}; control_compacto=${hasSearchableNative}`, catalogOver100 ? [] : ["Bloqueado: catálogo local actual <=100; no se inventa fixture ni PASS."]);
      expect(catalogOver100).toBeFalsy();

      const saveResponse = page.waitForResponse((r) => r.url().includes(`/api/bpm/operations/${operationId}/machines`) && r.request().method() === "PUT");
      await page.locator("#operation-detail-save").click();
      const saved = await saveResponse;
      expect(saved.status()).toBe(200);
      await page.reload();
      await expect(page.locator("[data-operation-machine-status], [data-operation-machine-member], [data-operation-machine-empty]").first()).toBeVisible({ timeout: 15000 });
      const reloaded = await page.locator("[data-operation-machine-member]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-operation-machine-member"))));
      const persisted = (await canonical(request)).body.data.machineIds;
      record("AC-21-22", JSON.stringify(reloaded.sort((a,b)=>a-b)) === JSON.stringify(persisted.sort((a,b)=>a-b)), `reloaded=${reloaded}; api=${persisted}`);
      await page.screenshot({ path: path.join(out, "AC-21-22-reloaded.png"), fullPage: true });
      expect(reloaded.sort((a,b)=>a-b)).toEqual(persisted.sort((a,b)=>a-b));
      await page.locator(`[data-operation-machine-remove="${candidates[0]}"]`).click();
      const removeResponse = page.waitForResponse((r) => r.url().includes(`/api/bpm/operations/${operationId}/machines`) && r.request().method() === "PUT");
      await page.locator("#operation-detail-save").click(); await removeResponse;
      await page.reload();
      await expect(page.locator("[data-operation-machine-status], [data-operation-machine-member], [data-operation-machine-empty]").first()).toBeVisible({ timeout: 15000 });
      expect(await page.locator(`[data-operation-machine-member="${candidates[0]}"]`).count()).toBe(0);
      const forbidden = JSON.stringify(networkEvidence).match(/equipment|canonical_ids|operation_machine_assignments/gi) || [];
      record("AC-21-23", forbidden.length === 0, `payloads_canónicos=${networkEvidence.filter((x) => x.payload).length}; claves_prohibidas=${forbidden.length}`);
      expect(forbidden).toHaveLength(0);
    } finally {
      if (original) {
        const cleanup = await replace(request, original);
        const final = await canonical(request);
        fs.writeFileSync(path.join(out, "cleanup-state.json"), JSON.stringify({ original, cleanup_status: cleanup.response.status(), final_machine_ids: final.body.data.machineIds }, null, 2));
        expect(final.body.data.machineIds.sort((a,b)=>a-b)).toEqual(original.sort((a,b)=>a-b));
      }
    }
  });
});
