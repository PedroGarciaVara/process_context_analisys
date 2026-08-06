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

  test("maquinas: filtra, selecciona y gestiona desde el modal", async ({ page }) => {
    await openRoute(page, "maquinas_v02");
    await expect(page.locator("[data-machine-row]").first()).toBeVisible();
    for (const status of ["all", "ready", "warning", "hold"]) {
      await page.locator(`[data-status-filter="${status}"]`).click();
      await expect(page.locator(`[data-status-filter="${status}"]`)).toBeVisible();
    }
    await page.locator('[data-status-filter="all"]').click();
    await page.locator("[data-machine-row]").first().click();
    const modal = page.locator("#machine-v02-modal");
    await expect(modal).toBeHidden();
    await page.locator('[data-action="machine-modal-open"]').click();
    await expect(modal).toBeVisible();
    await expect(modal.locator("[data-machine-tab]")).toHaveCount(2);
    await expect(modal.locator("[data-machine-tab='type']")).toContainText("Máquina genérica");
    await expect(modal.locator("[data-machine-tab='machine']")).toContainText("Máquina específica");
    const machineActions = await page.locator("[data-action^='machine-']").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-action")));
    expect(machineActions).toEqual(expect.arrayContaining(["machine-modal-open", "machine-modal-close", "machine-modal-cancel", "machine-save"]));
    expect(machineActions).not.toContain("machine-create");
    expect(machineActions).not.toContain("machine-update");
    expect(machineActions).not.toContain("machine-delete");
    await expect(page.locator("#machine-v02-name-field")).toHaveCount(1);

    const originalName = await modal.locator("#machine-v02-name-field").inputValue();
    await modal.locator("[data-machine-tab='machine']").click();
    await expect(modal.locator("#machine-v02-panel-machine")).toBeVisible();
    await expect(modal.locator("[data-stage-editor]")).toBeVisible();
    await expect(modal.locator("[data-stage-editor] textarea")).toHaveCount(0);
    const addStage = modal.locator("[data-stage-add]");
    let stagesEdited = false;
    if (await addStage.isEnabled()) {
      stagesEdited = true;
      await addStage.click();
      const stageName = modal.locator("[data-stage-name]").last();
      await stageName.click();
      await stageName.pressSequentially("Prueba UI");
      await modal.locator("[data-stage-add-substage]").last().click();
      const substageName = modal.locator("[data-substage-name]").last();
      await substageName.click();
      await substageName.pressSequentially("Subetapa UI");
    }
    await modal.locator("[data-machine-tab='type']").click();
    const typeJsonFields = {
      "machine-v02-type-capacity": "{\"nominal\":100}",
      "machine-v02-type-controls": "[{\"name\":\"PLC UI\"}]",
      "machine-v02-type-limitations": "[{\"name\":\"Límite UI\"}]",
      "machine-v02-type-characteristics": "[{\"name\":\"Característica UI\"}]",
    };
    for (const [fieldId, fieldValue] of Object.entries(typeJsonFields)) await modal.locator(`#${fieldId}`).fill(fieldValue);
    await modal.locator("#machine-v02-type-name").fill("Tipo máquina UI");
    await modal.locator("#machine-v02-type-technology").fill("Tecnología UI");
    await modal.locator("#machine-v02-type-principle").fill("Principio UI");
    await modal.locator("#machine-v02-type-general-description").fill("Descripción general UI");
    await modal.locator("[data-machine-tab='machine']").click();
    const machineJsonFields = {
      "machine-v02-specific-characteristics": "[{\"name\":\"Característica específica UI\"}]",
      "machine-v02-specific-parameters": "[{\"name\":\"Parámetro UI\",\"value\":1}]",
      "machine-v02-specific-ranges": "[{\"name\":\"Rango UI\",\"min\":0,\"max\":1}]",
      "machine-v02-specific-limitations": "[{\"name\":\"Limitación específica UI\"}]",
      "machine-v02-specific-instructions": "[{\"name\":\"Instrucción UI\"}]",
      "machine-v02-specific-differences": "[{\"name\":\"Diferencia UI\"}]",
    };
    for (const [fieldId, fieldValue] of Object.entries(machineJsonFields)) await modal.locator(`#${fieldId}`).fill(fieldValue);
    await modal.locator("#machine-v02-specific-description").fill("Descripción específica UI");
    await modal.locator("#machine-v02-name-field").fill(`${originalName} UI`);
    const machineUpdateResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/machines\/\d+$/) && response.request().method() === "PATCH");
    await modal.locator('[data-action="machine-save"]').click();
    const savedResponse = await machineUpdateResponse;
    expect(savedResponse.status()).toBe(200);
    const savedBody = await savedResponse.json();
    expect(savedBody.data.name).toBe(`${originalName} UI`);
    await expect(modal).toBeHidden();

    const restoreResponse = await page.request.patch(`/api/operational/machines/${savedBody.data.id}`, {
      data: { name: originalName, machine_type_id: savedBody.data.machineTypeId },
    });
    expect(restoreResponse.status()).toBe(200);
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
