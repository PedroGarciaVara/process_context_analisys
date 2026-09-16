import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const evidenceDir = path.join(".playwright-artifacts", "hypothesis-template-clean-summary", runId);
const templateUrl = "/#/arboles?contract_id=3";
const analysisUrl = "/#/analisis_causas?contract_id=3&analysis_id=39";
const detailUrl = "/#/causa_detalle?contrato_id=3&causa_id=264";

test("real RCA hypothesis template hides evaluation projection and analysis keeps scientific fields", async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });

  await page.goto(templateUrl);
  await expect(page.locator(".acv2-tree-hypothesis-item").first()).toBeVisible({ timeout: 15_000 });
  await page.locator(".acv2-tree-hypothesis-item").first().click();
  const templateCard = page.locator(".acv2-detail-panel .acv2-hypothesis-card").first();
  await expect(templateCard).toBeVisible();
  const templateText = (await templateCard.innerText()).trim();
  expect(templateText).not.toMatch(/Tipo|Métrica|Decisión|Pendiente|Validada|Rechazada|Inconclusa/);
  await expect(page.locator(".acv2-detail-panel .acv2-state-chip")).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, "01-template-read-only.png"), fullPage: true });
  fs.writeFileSync(path.join(evidenceDir, "01-template.html"), await templateCard.evaluate((node) => node.outerHTML));

  await page.goto(detailUrl);
  const detailCard = page.locator(".detail-hypothesis-card").first();
  await expect(detailCard).toBeVisible({ timeout: 15_000 });
  const detailText = (await detailCard.innerText()).trim();
  expect(detailText).toMatch(/Criterio de validación/i);
  expect(detailText).toMatch(/Método de cálculo/i);
  expect(detailText).not.toMatch(/Tipo|Métrica|Decisión|Pendiente|Validada|Rechazada|Inconclusa/);
  await expect(detailCard.locator(".status-chip")).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, "02-detail-template-read-only.png"), fullPage: true });
  fs.writeFileSync(path.join(evidenceDir, "02-detail-template.html"), await detailCard.evaluate((node) => node.outerHTML));

  await page.goto(analysisUrl);
  await expect(page.locator("#analysis-metric")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#analysis-decision")).toBeVisible();
  await expect(page.locator(".analysis-detail-panel .acv2-state-chip").first()).toBeVisible();
  const analysisText = await page.locator(".analysis-workspace-panel").innerText();
  expect(analysisText).toContain("Métrica");
  expect(analysisText).toContain("Decisión");
  await page.screenshot({ path: path.join(evidenceDir, "03-analysis-scientific-fields.png"), fullPage: true });
  fs.writeFileSync(path.join(evidenceDir, "03-analysis.html"), await page.locator(".analysis-workspace-panel").evaluate((node) => node.outerHTML));

  fs.writeFileSync(path.join(evidenceDir, "summary.json"), JSON.stringify({
    baseUrl: "http://127.0.0.1:8050",
    templateUrl,
    detailUrl,
    analysisUrl,
    templateVisibleText: templateText,
    detailVisibleText: detailText,
    templateForbiddenLabelsVisible: false,
    analysisMetricVisible: true,
    analysisDecisionVisible: true,
    writesPerformed: false,
  }, null, 2));
});
