import { test, expect } from "@playwright/test";

test("flujo completo: abre analisis, importa plantilla, traza evaluaciones y cierra", async ({ page }) => {
  await page.goto("/#/analisis_causas_v02");
  await expect(page.locator("#analysis-process-select")).toBeVisible();
  await page.locator("#analysis-process-select").selectOption({ index: 1 });
  await expect(page.locator("#analysis-template-select option")).toHaveCount(1);
  await page.locator("#analysis-opening-date").fill("2026-07-18");
  await page.locator("#analysis-participant").fill("Analista E2E");
  await page.locator("#analysis-opening-indication").fill("Desviacion detectada durante la inspeccion E2E.");

  const openResponse = page.waitForResponse((response) => response.url().endsWith("/api/rca-tree/analyses") && response.request().method() === "POST" && response.status() === 201);
  const treeRequest = page.waitForRequest((request) => request.url().includes("/api/rca-tree/nodes?") && request.url().includes("view=analisis_causas_v2"));
  await page.locator("#analysis-open-button").click();
  await openResponse;
  await expect(page).toHaveURL(/#\/analisis_causas_v02\?contract_id=1&analysis_id=\d+/);
  const routeContractId = new URL(page.url()).hash.split("?")[1].match(/(?:^|&)contract_id=(\d+)/)[1];
  const treeResponse = await treeRequest;
  expect(new URL(treeResponse.url()).searchParams.get("contract_id")).toBe(routeContractId);
  await expect(page.locator(".acv2-tree-node-button")).toHaveCount(9, { timeout: 10_000 });
  await expect(page.locator(".analysis-workspace-panel")).toBeVisible();
  await expect(page.locator("#cd-cause-name")).toHaveCount(0);
  await expect(page.locator("[data-tree-action]")).toHaveCount(0);

  await page.locator(".acv2-tree-node-button").first().click();
  await expect(page.locator(".acv2-analysis-hypothesis-evidence").first()).toBeVisible();
  await expect(page.locator("[data-hypothesis-action='evaluate']")).toHaveCount(2);
  await page.locator("[data-hypothesis-action='evaluate']").first().click();
  await expect(page.locator(".acv2-analysis-hypothesis-error").first()).toBeVisible();
  await page.locator(".acv2-analysis-hypothesis-evidence").first().fill("Evidencia de hipotesis aceptada.");
  const acceptedResult = page.waitForResponse((response) => response.url().match(/\/api\/analyses\/\d+\/results$/) && response.request().method() === "POST" && response.status() === 201);
  await page.locator("[data-hypothesis-action='evaluate']").first().click();
  await acceptedResult;
  await expect(page.locator(".acv2-state-retained").first()).toBeVisible();

  await page.locator(".acv2-tree-node-button").nth(1).click();
  await page.locator(".acv2-analysis-hypothesis-evidence").first().fill("La hipotesis se rechaza con evidencia de campo.");
  const hypothesisResult = page.waitForResponse((response) => response.url().match(/\/api\/analyses\/\d+\/results$/) && response.request().method() === "POST" && response.status() === 201);
  await page.locator("[data-hypothesis-action='evaluate']").nth(1).click();
  await hypothesisResult;
  const analysisId = page.url().match(/analysis_id=(\d+)/)[1];
  const analysisState = await page.request.get(`${process.env.UI_TEST_BASE_URL || "http://127.0.0.1:8050"}/api/rca-tree/analyses/${analysisId}`);
  expect(analysisState.ok()).toBeTruthy();
  expect((await analysisState.json()).data.results.filter((item) => item.tipo_elemento === "hipotesis")).toHaveLength(2);
  const baseUrl = process.env.UI_TEST_BASE_URL || "http://127.0.0.1:8050";
  const masterTree = await page.request.get(`${baseUrl}/api/rca-tree/nodes?view=arbol&contract_id=1`);
  const masterPayload = await masterTree.json();
  const masterHypotheses = Object.values(masterPayload.hypotheses_by_cause || {}).flat();
  expect(masterHypotheses.every((item) => item.estado === "pendiente")).toBeTruthy();

  await page.locator("#analysis-final-conclusion").fill("Conclusion final del analisis E2E.");
  const closeResponse = page.waitForResponse((response) => response.url().match(/\/api\/analyses\/\d+$/) && response.request().method() === "PATCH" && response.status() === 200);
  await page.locator("#analysis-close-button").click();
  await closeResponse;
  await expect(page.locator("#analysis-workspace-status")).toContainText("cerrado");
  await expect(page.locator("#analysis-workspace-alert")).toContainText("Analisis cerrado");
});
