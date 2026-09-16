import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseURL = (process.env.UI_TEST_BASE_URL || "http://127.0.0.1:8050").replace(/\/$/, "");
const processId = "abfead18-386d-4f27-9957-4b24da26716d";
const operationId = "bcb6016f-5352-5d63-9559-82434215e1c3";
const runDir = process.env.E2E_REQ21_RUN_DIR || `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-req21-amd21-002-over100`;
const out = path.join(process.env.E2E_ARTIFACTS_DIR || ".playwright-artifacts/test-results", runDir);
const manifest = JSON.parse(fs.readFileSync(process.env.REQ21_FIXTURE_MANIFEST, "utf8"));
const acResults = { "AC-21-21": { passed: false, detail: "No probado" } };
const consoleLines = [], requestFailures = [], responseErrors = [], networkEvidence = [];
function record(passed, detail, evidence = []) { acResults["AC-21-21"] = { passed: Boolean(passed), detail, evidence }; fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, "ac-results.json"), JSON.stringify(acResults, null, 2)); }

test("AC-21-21 catálogo >100 compacto y localizable sin controles masivos", async ({ page }) => {
  fs.mkdirSync(out, { recursive: true });
  page.on("console", (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  page.on("requestfailed", (r) => requestFailures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText || "failed"}`));
  page.on("response", (r) => { if (r.status() >= 400) responseErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  const response = await page.request.get(`${baseURL}/api/bpm/operations/${operationId}/machines?process_id=${processId}`);
  const body = await response.json(); networkEvidence.push({ method: "GET", url: response.url(), status: response.status(), body });
  const catalog = body.data.catalog;
  await page.goto(`${baseURL}/#/operaciones_detalle?process_id=${processId}&node_id=${operationId}`);
  await expect(page.locator("#operation-detail-form")).toBeVisible();
  const select = page.locator("#operation-machine-select");
  await expect(select).toHaveCount(1);
  const optionCount = await select.locator("option").count();
  const checkboxRadioCount = await page.locator("input[type=checkbox], input[type=radio], input[data-operation-machine]").count();
  const members = page.locator("[data-operation-machine-member]");
  const fixture = manifest.created[manifest.created.length - 1];
  await select.selectOption(String(fixture.id));
  const selectedValue = await select.inputValue();
  const compact = await select.getAttribute("size") === null && optionCount === catalog.length + 1;
  const onlyAssociated = await members.evaluateAll((els) => els.map((e) => Number(e.dataset.operationMachineMember))).then((values) => values.every((id) => body.data.machineIds.includes(id)));
  const passed = response.status() === 200 && catalog.length > 100 && optionCount === catalog.length + 1 && checkboxRadioCount === 0 && compact && String(selectedValue) === String(fixture.id) && onlyAssociated;
  record(passed, `catalogo=${catalog.length}; opciones=${optionCount}; fixture=${fixture.id}; selected=${selectedValue}; check_radio=${checkboxRadioCount}; compacto=${compact}; asociados_solo_canonicos=${onlyAssociated}`, ["AC-21-21-over100.png"]);
  await page.screenshot({ path: path.join(out, "AC-21-21-over100.png"), fullPage: true });
  expect(catalog.length).toBeGreaterThan(100);
  expect(optionCount).toBe(catalog.length + 1);
  expect(checkboxRadioCount).toBe(0);
  expect(compact).toBeTruthy();
  expect(String(selectedValue)).toBe(String(fixture.id));
  expect(onlyAssociated).toBeTruthy();
});

test.afterAll(() => {
  fs.writeFileSync(path.join(out, "console.log"), consoleLines.join("\n"));
  fs.writeFileSync(path.join(out, "request-failures.log"), requestFailures.join("\n"));
  fs.writeFileSync(path.join(out, "response-errors.log"), responseErrors.join("\n"));
  fs.writeFileSync(path.join(out, "network-evidence.json"), JSON.stringify(networkEvidence, null, 2));
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ run_folder: runDir, pass: acResults["AC-21-21"].passed ? 1 : 0, fail: acResults["AC-21-21"].passed ? 0 : 1, skip: 0, total: 1, ac_results: acResults }, null, 2));
});
