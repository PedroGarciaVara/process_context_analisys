import { test, expect } from "@playwright/test";

const unique = (prefix) => `${prefix}-${Date.now()}`;

async function openRoute(page, route) {
  await page.goto(`/#/${route}`);
  await expect(page.locator("main")).toBeVisible();
}

test.describe.serial("webapp-java UI", () => {
  test("inicio: renderiza el panel y navega a cada pagina", async ({ page }) => {
    await openRoute(page, "inicio");
    await expect(page.getByText("Investigacion activa")).toBeVisible();
    await expect(page.locator("#recent-analysis-list [data-analysis-card]").first()).toBeVisible();
    await page.locator("#recent-analysis-search").fill("texto que no existe");
    await expect(page.locator("#recent-analysis-list [data-analysis-card]")).toHaveCount(0);
    await page.locator("#recent-analysis-search").fill("");
    await page.locator("#recent-analysis-status").selectOption("todos");
    await expect(page.locator("#recent-analysis-list [data-analysis-card]").first()).toBeVisible();
    await page.locator('[data-action="new-investigation"]').click();
    await expect(page).toHaveURL(/#\/analisis_causas_v02/);
    await expect(page.locator("#analysis-process-select")).toBeVisible();
    await openRoute(page, "inicio");
    for (const route of ["procesos_v02", "contratos_v02", "maquinas_v02", "arboles_v02", "analisis_causas_v02"]) {
      await page.locator(`[data-route="${route}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`#/${route}`));
      await expect(page.locator("main")).toBeVisible();
      await openRoute(page, "inicio");
    }
  });

  test("procesos: filtra, selecciona, crea, actualiza, navega y elimina", async ({ page }) => {
    await openRoute(page, "procesos_v02");
    await expect(page.locator("[data-process-row]").first()).toBeVisible();
    for (const status of ["all", "active", "hold", "inactive"]) {
      await page.locator(`[data-process-filter="${status}"]`).click();
      await expect(page.locator("[data-process-filter].bg-primary")).toBeVisible();
    }
    await page.locator('[data-process-filter="all"]').click();
    const row = page.locator("[data-process-row]").first();
    await row.click();
    await expect(page.locator("#process-v02-name")).not.toHaveValue("");
    await row.locator('[data-action="process-contracts"]').click();
    await expect(page).toHaveURL(/#\/contratos_v02/);
    await openRoute(page, "procesos_v02");
    await page.locator("[data-process-row]").first().locator('[data-action="process-tree"]').click();
    await expect(page).toHaveURL(/#\/arboles_v02/);

    await openRoute(page, "procesos_v02");
    const name = unique("Proceso UI");
    await page.locator("#process-v02-name").fill(name);
    const createResponse = page.waitForResponse((response) => response.url().includes("/api/operational/processes") && response.request().method() === "POST" && response.status() === 201);
    await page.locator('[data-action="process-create"]').click();
    await createResponse;
    await expect(page.locator("#process-v02-alert")).toContainText("Proceso creado");
    await expect(page.locator("[data-process-row]").filter({ hasText: name })).toHaveCount(1);
    await page.locator("#process-v02-name").fill(`${name} actualizado`);
    const updateResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/processes\/\d+$/) && response.request().method() === "PATCH" && response.status() === 200);
    await page.locator('[data-action="process-update"]').click();
    await updateResponse;
    await expect(page.locator("[data-process-row]").filter({ hasText: `${name} actualizado` })).toHaveCount(1);
    const deleteResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/processes\/\d+$/) && response.request().method() === "DELETE" && response.status() === 200);
    await page.locator('[data-action="process-delete"]').click();
    await deleteResponse;
    await expect(page.locator("[data-process-row]").filter({ hasText: `${name} actualizado` })).toHaveCount(0);
  });

  test("contratos: filtra, selecciona, crea, actualiza, cambia estado, asigna y elimina", async ({ page }) => {
    await openRoute(page, "contratos_v02");
    await expect(page.locator("[data-contract-row]").first()).toBeVisible();
    for (const status of ["all", "open", "review", "closed"]) {
      await page.locator(`[data-contract-filter="${status}"]`).click();
      await expect(page.locator("[data-contract-filter].bg-primary")).toBeVisible();
    }
    await page.locator('[data-contract-filter="all"]').click();
    await page.locator("[data-contract-row]").first().click();
    await expect(page.locator("#contract-v02-name")).not.toHaveValue("");
    await page.locator('[data-action="contract-machines"]').first().click();
    await expect(page).toHaveURL(/#\/maquinas_v02/);
    await openRoute(page, "contratos_v02");
    await page.locator('[data-action="contract-tree"]').first().click();
    await expect(page).toHaveURL(/#\/arboles_v02/);

    await openRoute(page, "contratos_v02");
    const name = unique("Contrato UI");
    const process = page.locator("#contract-v02-process");
    await process.selectOption({ index: 0 });
    await page.locator("#contract-v02-name").fill(name);
    await page.locator("#contract-v02-metrica").fill("Metrica UI");
    await page.locator("#contract-v02-objetivo").fill("Objetivo UI");
    const contractCreateResponse = page.waitForResponse((response) => response.url().endsWith("/api/operational/contracts") && response.request().method() === "POST" && response.status() === 201);
    await page.locator('[data-action="contract-create"]').click();
    await contractCreateResponse;
    await expect(page.locator("#contract-v02-alert")).toContainText("Contrato creado");
    await expect(page.locator("[data-contract-row]").filter({ hasText: name })).toHaveCount(1);
    await page.locator("#contract-v02-name").fill(`${name} actualizado`);
    const contractUpdateResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+$/) && response.request().method() === "PATCH" && response.status() === 200);
    await page.locator('[data-action="contract-update"]').click();
    await contractUpdateResponse;
    await expect(page.locator("#contract-v02-alert")).toContainText("Contrato actualizado");
    const updatedContractRow = page.locator("[data-contract-row]").filter({ hasText: `${name} actualizado` });
    await expect(updatedContractRow).toHaveCount(1);
    await updatedContractRow.click();
    await expect(page.locator("#contract-v02-name")).toHaveValue(`${name} actualizado`);
    const toggleResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+\/toggle$/) && response.request().method() === "POST" && response.status() === 200);
    await page.locator('[data-action="contract-toggle"]').click();
    await toggleResponse;
    await expect(page.locator("[data-contract-row]").filter({ hasText: `${name} actualizado` })).toHaveCount(1);
    const machines = page.locator("#contract-v02-machines");
    if (await machines.locator("option").count()) {
      await machines.selectOption({ index: 0 });
    }
    const assignResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+\/machines$/) && response.request().method() === "PUT" && response.status() === 200);
    await page.locator('[data-action="contract-save-machines"]').click();
    await assignResponse;
    await machines.selectOption([]);
    const unassignResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+\/machines$/) && response.request().method() === "PUT" && response.status() === 200);
    await page.locator('[data-action="contract-save-machines"]').click();
    await unassignResponse;
    await expect(page.locator("[data-contract-row]").filter({ hasText: `${name} actualizado` })).toHaveCount(1);
    const contractDeleteResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+$/) && response.request().method() === "DELETE" && response.status() === 200);
    await page.locator('[data-action="contract-delete"]').click();
    await contractDeleteResponse;
    await expect(page.locator("[data-contract-row]").filter({ hasText: `${name} actualizado` })).toHaveCount(0);
  });

  test("maquinas: filtra, selecciona, navega, crea, actualiza y elimina", async ({ page }) => {
    await openRoute(page, "maquinas_v02");
    await expect(page.locator("[data-machine-row]").first()).toBeVisible();
    for (const status of ["all", "ready", "warning", "hold"]) {
      await page.locator(`[data-status-filter="${status}"]`).click();
      await expect(page.locator(`[data-status-filter="${status}"]`)).toBeVisible();
    }
    await page.locator('[data-status-filter="all"]').click();
    await page.locator("[data-machine-row]").first().click();
    await expect(page.locator("#machine-v02-name-field")).not.toHaveValue("");
    await page.locator('[data-action="machine-tree"]').first().click();
    await expect(page).toHaveURL(/#\/arboles_v02/);
    await openRoute(page, "maquinas_v02");
    await page.locator('[data-action="machine-select"]').first().click();
    await expect(page.locator("#machine-v02-name-field")).not.toHaveValue("");

    const name = unique("Maquina UI");
    await page.locator("#machine-v02-name-field").fill(name);
    const machineCreateResponse = page.waitForResponse((response) => response.url().endsWith("/api/operational/machines") && response.request().method() === "POST" && response.status() === 201);
    await page.locator('[data-action="machine-create"]').click();
    await machineCreateResponse;
    await expect(page.locator("[data-machine-row]").filter({ hasText: name })).toHaveCount(1);
    await page.locator("#machine-v02-name-field").fill(`${name} updated`);
    const machineUpdateResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/machines\/\d+$/) && response.request().method() === "PATCH" && response.status() === 200);
    await page.locator('[data-action="machine-update"]').click();
    await machineUpdateResponse;
    const updatedMachineRow = page.locator("[data-machine-row]").filter({ hasText: `${name} updated` });
    await expect(updatedMachineRow).toHaveCount(1);
    await updatedMachineRow.click();
    await expect(page.locator("#machine-v02-name-field")).toHaveValue(`${name} updated`);
    const machineDeleteResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/machines\/\d+$/) && response.request().method() === "DELETE" && response.status() === 200);
    await page.locator('[data-action="machine-delete"]').click();
    await machineDeleteResponse;
    await expect(page.locator("[data-machine-row]").filter({ hasText: `${name} updated` })).toHaveCount(0);
  });

  test("arbol y analisis: carga nodos, selecciona tarjetas, cambia zoom y abre detalle", async ({ page }) => {
    await page.goto("/#/arboles_v02?contract_id=1");
    const cards = page.locator(".acv2-tree-node-button");
    await expect(cards).toHaveCount(9);
    for (const index of [0, 2, 5, 8]) {
      const nodeId = await cards.nth(index).getAttribute("data-node-id");
      await cards.nth(index).click();
      await expect(page.locator(`[data-node-id="${nodeId}"] .acv2-tree-card`)).toHaveClass(/active/);
    }
    const zoomLabel = page.locator(".acv2-context-overline");
    const initialZoom = await zoomLabel.textContent();
    await page.locator(".acv2-zoom-btn").nth(0).click();
    await expect(zoomLabel).not.toHaveText(initialZoom || "");
    await page.locator(".acv2-zoom-btn").nth(1).click();
    await page.locator('[data-action="tree-add-root-v02"]').click();
    await expect(page).toHaveURL(/#\/causa_detalle_v02\?contrato_id=1/);

    const analysisTreeResponse = page.waitForResponse((response) => response.url().includes("/api/causas?view=analisis_causas_v2") && response.status() === 200);
    await page.goto("/#/analisis_causas_v02?contract_id=1&analysis_id=1");
    await analysisTreeResponse;
    await expect(page.getByText("Analisis causas").first()).toBeVisible();
    await expect(page.locator(".acv2-tree-node-button")).toHaveCount(9, { timeout: 10_000 });
  });

  test("detalle de causa: muestra modos de alta/edicion y formulario de hipotesis", async ({ page }) => {
    await page.goto("/#/causa_detalle_v02?contrato_id=1");
    await expect(page.locator("#cd-editor-mode-wrap")).toBeVisible();
    await expect(page.locator('[data-editor-mode="new_cause"]')).toBeVisible();
    await expect(page.locator('[data-editor-mode="link_existing_cause"]')).toBeVisible();
    await page.locator('[data-editor-mode="link_existing_cause"]').click();
    await expect(page.locator("#cd-link-search")).toBeVisible();
    await page.locator("#cd-link-clear").click();
    await page.locator('[data-editor-mode="new_cause"]').click();
    await expect(page.locator("#cd-cause-save")).toBeVisible();
    await page.goto("/#/causa_detalle_v02?contrato_id=1&causa_id=1");
    await expect(page.locator("#cd-cause-save")).toBeVisible();
    await expect(page.locator("#cd-hypothesis-save")).toBeVisible();
    await expect(page.locator("#cd-hypothesis-new")).toBeVisible();
  });
});
