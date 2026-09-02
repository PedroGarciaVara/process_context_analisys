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
    await expect(page).toHaveURL(/#\/analisis_causas/);
    await expect(page.locator("#analysis-process-select")).toBeVisible();
    await openRoute(page, "inicio");
    for (const route of ["procesos", "contratos", "maquinas", "arboles", "analisis_causas"]) {
      await page.locator(`[data-route="${route}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`#/${route}`));
      await expect(page.locator("main")).toBeVisible();
      await openRoute(page, "inicio");
    }
  });

  test("procesos: selecciona, navega y delega la gestión en BPM", async ({ page }) => {
    await openRoute(page, "procesos");
    await expect(page.locator("[data-process-row]").first()).toBeVisible();
    await expect(page.locator('[data-action="process-detail"]').first()).toBeVisible();
    await page.locator('[data-action="process-detail"]').first().click();
    await expect(page).toHaveURL(/#\/procesos_detalle/);
    const processDetail = page.locator("#process-page-form");
    await expect(processDetail).toBeVisible();
    await expect(processDetail.locator("#process-page-code")).not.toHaveValue("");
    const processName = await processDetail.locator("#process-page-name").inputValue();
    const processSaveResponse = page.waitForResponse((response) => response.url().match(/\/api\/process-modeling\/processes\/[^/]+$/) && response.request().method() === "PATCH" && response.status() === 200);
    await processDetail.locator('[data-action="process-page-save"]').click();
    await processSaveResponse;
    await expect(page.locator("#process-page-alert")).toContainText("actualizado");
    await page.getByRole("link", { name: "Volver a procesos", exact: true }).click();
    await expect(page).toHaveURL(/#\/procesos/);
    await expect(page.locator("[data-process-row]").first()).toContainText(processName);
    await expect(page.locator("[data-process-filter]")).toHaveCount(0);
    await expect(page.locator("th").filter({ hasText: "Responsable" })).toHaveCount(0);
    await expect(page.locator("th").filter({ hasText: "Estado" })).toHaveCount(0);
    await expect(page.locator('[data-action="process-create"]')).toBeVisible();
    await expect(page.locator('[data-action="process-create"]')).toHaveAttribute("href", "#/modelado-procesos");
    await expect(page.locator('[data-action="right-open-contracts"], [data-action="right-open-tree"]')).toHaveCount(0);
    await expect(page.getByText("Detalle del alcance", { exact: true })).toHaveCount(0);
    const row = page.locator("[data-process-row]").first();
    await row.click();
    await expect(page.locator("#process-v02-name")).toHaveCount(0);
    await expect(page.locator('[data-action="process-update"]')).toHaveCount(0);
    await expect(page.locator('[data-action="process-delete"]')).toHaveCount(0);
    await row.locator('[data-action="process-contracts"]').click();
    await expect(page).toHaveURL(/#\/contratos/);
    await openRoute(page, "procesos");
    await expect(page.locator('[data-action="process-tree"]')).toHaveCount(0);

    await openRoute(page, "procesos");
    await page.locator('[data-action="process-create"]').click();
    await expect(page).toHaveURL(/#\/modelado-procesos/);
  });

  test("contratos: filtra, crea, abre detalle, edita y asigna maquinas", async ({ page }) => {
    await openRoute(page, "contratos");
    await expect(page.locator("[data-contract-row]").first()).toBeVisible();
    await expect(page.locator('[data-action="contract-machines"], [data-action="right-open-tree"], [data-action="contract-update"], [data-action="contract-toggle"], [data-action="contract-delete"], [data-action="contract-save-machines"]')).toHaveCount(0);
    await expect(page.locator('[data-action="contract-detail"]').first()).toBeVisible();
    const processFilter = page.locator("#contract-process-filter");
    await expect(processFilter).toBeVisible();
    await processFilter.selectOption({ index: 1 });
    await expect(page.locator("[data-contract-row]").first()).toBeVisible();
    await processFilter.selectOption("");
    for (const status of ["all", "open", "review", "closed"]) {
      await page.locator(`[data-contract-filter="${status}"]`).click();
      await expect(page.locator("[data-contract-filter].bg-primary")).toBeVisible();
    }
    await page.locator('[data-contract-filter="all"]').click();
    await page.locator("[data-contract-row]").first().click();
    await expect(page.locator('[data-action="contract-detail"]').first()).toBeVisible();
    await page.locator('[data-action="contract-detail"]').first().click();
    const detailModal = page.locator("#contract-detail-v02-modal");
    await expect(detailModal).toBeVisible();
    await expect(detailModal.locator("#contract-detail-v02-name")).not.toHaveValue("");
    await expect(detailModal.locator("#contract-detail-v02-machines")).toBeVisible();
    page.once("dialog", (dialog) => dialog.dismiss());
    await detailModal.locator('[data-action="contract-detail-delete"]').click();
    await expect(detailModal).toBeVisible();
    await detailModal.locator('[data-action="contract-detail-cancel"]').click();
    await expect(detailModal).toBeHidden();
    await page.locator('[data-action="contract-tree"]').first().click();
    await expect(page).toHaveURL(/#\/arboles/);

    await openRoute(page, "contratos");
    const name = unique("Contrato UI");
    await expect(page.locator('[data-action="contract-create-open"]')).toBeVisible();
    await expect(page.locator('[data-action="contract-create"]')).toHaveCount(0);
    await page.locator('[data-action="contract-create-open"]').click();
    const createModal = page.locator("#contract-create-v02-modal");
    await expect(createModal).toBeVisible();
    await createModal.click({ position: { x: 4, y: 4 } });
    await expect(createModal).toBeVisible();
    await createModal.locator('[data-action="contract-create-cancel"]').click();
    await expect(createModal).toBeHidden();
    await page.locator('[data-action="contract-create-open"]').click();
    await createModal.locator("#contract-create-v02-scope-type").selectOption("operation");
    await createModal.locator("#contract-create-v02-process-search").fill("Preparación de productos");
    await createModal.locator("#contract-create-v02-process-scope").selectOption({ label: "Preparación de productos químicos" });
    const operationScope = createModal.locator("#contract-create-v02-operation-scope");
    await expect(operationScope).toBeEnabled();
    await expect(operationScope.locator("option")).toHaveCount(6);
    await createModal.locator("#contract-create-v02-operation-search").fill("Dosificación");
    await expect(operationScope.locator("option")).toHaveCount(1);
    await createModal.locator("#contract-create-v02-scope-type").selectOption("process");
    const scopeType = createModal.locator("#contract-create-v02-scope-type");
    await scopeType.selectOption("process");
    await createModal.locator("#contract-create-v02-process-scope").selectOption({ index: 0 });
    await createModal.locator("#contract-create-v02-name").fill(name);
    await createModal.locator("#contract-create-v02-metrica").fill("Metrica UI");
    await createModal.locator("#contract-create-v02-objetivo").fill("Objetivo UI");
    const contractCreateResponse = page.waitForResponse((response) => response.url().endsWith("/api/bpm/operational/contracts") && response.request().method() === "POST" && response.status() === 201);
    await createModal.locator('[data-action="contract-create-submit"]').click();
    await contractCreateResponse;
    await expect(page.locator("#contract-create-v02-modal")).toBeHidden();
    await expect(page.locator("[data-contract-row]").filter({ hasText: name })).toHaveCount(1);
    const firstDetailMachinesLoad = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+\/machines$/) && response.request().method() === "GET" && response.status() === 200);
    await page.locator("[data-contract-row]").filter({ hasText: name }).locator('[data-action="contract-detail"]').click();
    const savedDetail = page.locator("#contract-detail-v02-modal");
    await expect(savedDetail).toBeVisible();
    await firstDetailMachinesLoad;
    await savedDetail.locator("#contract-detail-v02-name").fill(`${name} actualizado`);
    const contractUpdateResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+$/) && response.request().method() === "PATCH" && response.status() === 200);
    const contractMachinesResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+\/machines$/) && response.request().method() === "PUT" && response.status() === 200);
    await savedDetail.locator('[data-action="contract-detail-save"]').click();
    await contractUpdateResponse;
    await contractMachinesResponse;
    const updatedContractRow = page.locator("[data-contract-row]").filter({ hasText: `${name} actualizado` });
    await expect(updatedContractRow).toHaveCount(1);
    await expect(savedDetail).toBeHidden();
    const secondDetailMachinesLoad = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+\/machines$/) && response.request().method() === "GET" && response.status() === 200);
    await updatedContractRow.locator('[data-action="contract-detail"]').click();
    await secondDetailMachinesLoad;
    await expect(page.locator("#contract-detail-v02-name")).toHaveValue(`${name} actualizado`);
    await expect(savedDetail).toHaveAttribute("data-modal-state", "open");
    const machines = page.locator("#contract-detail-v02-machines");
    if (await machines.locator("option").count()) {
      await machines.selectOption({ index: 0 });
    }
    const assignResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+\/machines$/) && response.request().method() === "PUT" && response.status() === 200);
    await page.locator('[data-action="contract-detail-save"]').click();
    await page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+$/) && response.request().method() === "PATCH" && response.status() === 200);
    await assignResponse;
    await openRoute(page, "contratos");
    const afterAssignRow = page.locator("[data-contract-row]").filter({ hasText: `${name} actualizado` });
    await expect(afterAssignRow).toHaveCount(1);
    await afterAssignRow.locator('[data-action="contract-detail"]').click({ force: true });
    await expect(savedDetail).toBeVisible();
    await expect(savedDetail).toHaveAttribute("data-modal-state", "open");
    await machines.selectOption([]);
    const unassignResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+\/machines$/) && response.request().method() === "PUT" && response.status() === 200);
    await page.locator('[data-action="contract-detail-save"]').click();
    await page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+$/) && response.request().method() === "PATCH" && response.status() === 200);
    await unassignResponse;
    await openRoute(page, "contratos");
    const afterUnassignRow = page.locator("[data-contract-row]").filter({ hasText: `${name} actualizado` });
    await expect(afterUnassignRow).toHaveCount(1);
    await afterUnassignRow.locator('[data-action="contract-detail"]').click({ force: true });
    await expect(savedDetail).toBeVisible();
    await expect(savedDetail).toHaveAttribute("data-modal-state", "open");
    const deleteResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/contracts\/\d+$/) && response.request().method() === "DELETE" && response.status() === 200);
    const catalogRefresh = page.waitForResponse((response) => response.url().endsWith("/api/bpm/operational/catalog") && response.request().method() === "GET" && response.status() === 200);
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator('[data-action="contract-detail-delete"]').click();
    await deleteResponse;
    await catalogRefresh;
    await expect(page.locator("#contract-detail-v02-modal")).toBeHidden();
    await expect(page.locator("[data-contract-row]").filter({ hasText: `${name} actualizado` })).toHaveCount(0);
  });

  test("maquinas: filtra, selecciona y gestiona desde el modal", async ({ page }) => {
    await openRoute(page, "maquinas");
    await expect(page.locator("[data-machine-row]").first()).toBeVisible();
    await expect(page.locator("[data-status-filter]")).toHaveCount(0);
    await expect(page.locator("th").filter({ hasText: "Estado" })).toHaveCount(0);
    await page.locator("[data-machine-row]").first().click();
    const modal = page.locator("#machine-v02-modal");
    await expect(modal).toBeHidden();
    await page.locator('[data-action="machine-select"]').first().click();
    await expect(modal).toBeVisible();
    await expect(page.locator('[data-action="machine-modal-open"]')).toHaveCount(0);
    await expect(modal.locator("[data-machine-tab]")).toHaveCount(2);
    await expect(modal.locator("[data-machine-tab='type']")).toContainText("Máquina genérica");
    await expect(modal.locator("[data-machine-tab='machine']")).toContainText("Máquina específica");
    const machineActions = await page.locator("[data-action^='machine-']").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-action")));
    expect(machineActions).toEqual(expect.arrayContaining(["machine-select", "machine-modal-cancel", "machine-save"]));
    await modal.click({ position: { x: 4, y: 4 } });
    await expect(modal).toBeVisible();
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
    for (const [fieldId, fieldValue] of Object.entries(typeJsonFields)) {
      await modal.locator(`#${fieldId}`).locator("xpath=ancestor::details").locator("summary").click();
      await modal.locator(`#${fieldId}`).fill(fieldValue);
    }
    await modal.locator("[data-machine-tab='type']").click();
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
    for (const [fieldId, fieldValue] of Object.entries(machineJsonFields)) {
      await modal.locator(`#${fieldId}`).locator("xpath=ancestor::details").locator("summary").click();
      await modal.locator(`#${fieldId}`).fill(fieldValue);
    }
    await modal.locator("#machine-v02-specific-description").fill("Descripción específica UI");
    await modal.locator("#machine-v02-name-field").fill(`${originalName} UI`);
    const machineUpdateResponse = page.waitForResponse((response) => response.url().match(/\/api\/operational\/machines\/\d+$/) && response.request().method() === "PATCH");
    await modal.locator('[data-action="machine-save"]').click();
    const savedResponse = await machineUpdateResponse;
    expect(savedResponse.status()).toBe(200);
    const savedBody = await savedResponse.json();
    expect(savedBody.data.name).toBe(`${originalName} UI`);
    await expect(modal).toBeHidden();

    const restoreResponse = await page.request.patch(`/api/bpm/operational/machines/${savedBody.data.id}`, {
      data: { name: originalName, machine_type_id: savedBody.data.machineTypeId },
    });
    expect(restoreResponse.status()).toBe(200);
  });

  test("arbol y analisis: carga nodos, selecciona tarjetas, cambia zoom y abre detalle", async ({ page }) => {
    await page.goto("/#/arboles?contract_id=1");
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
    await expect(page).toHaveURL(/#\/causa_detalle\?contrato_id=1/);

    const analysisTreeResponse = page.waitForResponse((response) => response.url().includes("/api/rca-tree/nodes?view=analisis_causas_v2") && response.status() === 200);
    await page.goto("/#/analisis_causas?contract_id=1&analysis_id=1");
    await analysisTreeResponse;
    await expect(page.getByText("Analisis causas").first()).toBeVisible();
    await expect(page.locator(".acv2-tree-node-button")).toHaveCount(9, { timeout: 10_000 });
  });

  test("detalle de causa: muestra modos de alta/edicion y formulario de hipotesis", async ({ page }) => {
    await page.goto("/#/causa_detalle?contrato_id=1");
    await expect(page.locator("[data-action='add-evidence']")).toHaveCount(0);
    await expect(page.locator("[data-action='help']")).toBeVisible();
    await expect(page.locator("[data-action='signout']")).toBeVisible();
    await expect(page.locator("#cd-editor-mode-wrap")).toBeVisible();
    await expect(page.locator('[data-editor-mode="new_cause"]')).toBeVisible();
    await expect(page.locator('[data-editor-mode="link_existing_cause"]')).toBeVisible();
    await page.locator('[data-editor-mode="link_existing_cause"]').click();
    await expect(page.locator("#cd-link-search")).toBeVisible();
    await page.locator("#cd-link-clear").click();
    await page.locator('[data-editor-mode="new_cause"]').click();
    await expect(page.locator("#cd-cause-save")).toBeVisible();
    await page.goto("/#/causa_detalle?contrato_id=1&causa_id=1");
    await expect(page.locator("#cd-cause-save")).toBeVisible();
    await expect(page.locator("#cd-hypothesis-save")).toBeVisible();
    await expect(page.locator("#cd-hypothesis-new")).toBeVisible();
  });
});
