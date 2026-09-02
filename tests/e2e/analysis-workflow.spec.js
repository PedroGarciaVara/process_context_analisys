import { test, expect } from "@playwright/test";

test("flujo completo: abre plantilla, traza OK/NO OK y re-renderiza análisis cerrado", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/#/analisis_causas");
  await expect(page.locator("#analysis-process-select")).toBeVisible();
  await page.locator("#analysis-process-select").selectOption({ index: 1 });

  const template = page.locator("#analysis-template-select option").filter({ hasText: "Dosificación" }).first();
  await expect(template).toBeAttached();
  await page.locator("#analysis-template-select").selectOption(await template.getAttribute("value"));
  await page.locator("#analysis-opening-indication").fill("Desviación detectada durante la inspección E2E.");

  const openResponse = page.waitForResponse((response) => response.url().endsWith("/api/rca-tree/analyses") && response.request().method() === "POST" && response.status() === 201);
  await page.locator("#analysis-open-button").click();
  const created = await (await openResponse).json();
  const analysisId = created.data.id;
  await expect(page).toHaveURL(new RegExp(`analysis_id=${analysisId}`));
  await expect(page.locator(".acv2-tree-node-button").nth(1)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".analysis-workspace-panel")).toBeVisible();

  const evaluations = [
    ["OK", "Evidencia OK E2E", "Comentario OK E2E"],
    ["NO OK", "Evidencia NO OK E2E", "Comentario NO OK E2E"],
  ];
  for (const [index, [label, evidence, comment]] of evaluations.entries()) {
    await page.locator(".acv2-tree-node-button").nth(index).click();
    await page.locator(".acv2-analysis-hypothesis-evidence").first().fill(evidence);
    await page.locator(".acv2-analysis-hypothesis-comment").first().fill(comment);
    const resultResponse = page.waitForResponse((response) => response.url().endsWith(`/api/rca-tree/analyses/${analysisId}/results`) && response.request().method() === "POST" && response.status() === 201);
    await page.getByRole("button", { name: label, exact: true }).click();
    await resultResponse;
  }

  const stateResponse = await page.request.get(`/api/rca-tree/analyses/${analysisId}`);
  expect(stateResponse.ok()).toBeTruthy();
  const results = (await stateResponse.json()).data.results.filter((item) => item.tipo_elemento === "hipotesis");
  expect(results).toEqual(expect.arrayContaining([
    expect.objectContaining({ evaluacion: "confirmada", evidencia: "Evidencia OK E2E", conclusion: "Comentario OK E2E" }),
    expect.objectContaining({ evaluacion: "descartada", evidencia: "Evidencia NO OK E2E", conclusion: "Comentario NO OK E2E" }),
  ]));

  await page.locator("#analysis-final-conclusion").fill("Conclusión final del análisis E2E.");
  const closeResponse = page.waitForResponse((response) => response.url().endsWith(`/api/rca-tree/analyses/${analysisId}`) && response.request().method() === "PATCH" && response.status() === 200);
  await page.locator("#analysis-close-button").click();
  await closeResponse;
  await expect(page.locator("#analysis-workspace-status")).toContainText("cerrado");
  await expect(page.locator("#analysis-workspace-alert")).toContainText("Analisis cerrado");
  await expect(page.locator("[data-hypothesis-action='evaluate']")).toHaveCount(0);

  await page.reload();
  await expect(page.locator("#analysis-workspace-status")).toContainText("cerrado");
  await expect(page.locator(".acv2-analysis-hypothesis-evidence").first()).toHaveValue("Evidencia NO OK E2E");
  await expect(page.locator(".acv2-analysis-hypothesis-comment").first()).toHaveValue("Comentario NO OK E2E");
  await expect(page.locator("[data-hypothesis-action='evaluate']")).toHaveCount(0);
});
