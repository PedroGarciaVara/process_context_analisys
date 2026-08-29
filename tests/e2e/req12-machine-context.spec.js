import { test, expect } from "@playwright/test";

test("req12: muestra los cuatro bloques del contexto de máquina", async ({ page }) => {
  const machinesResponse = await page.request.get("/api/bpm/operational/machines");
  expect(machinesResponse.ok()).toBe(true);
  const machinesPayload = await machinesResponse.json();
  const machines = machinesPayload.data?.data ?? machinesPayload.data ?? [];

  let seededMachine;
  for (const machine of machines) {
    const contextResponse = await page.request.get(`/api/bpm/operational/machines/${machine.id}/context`);
    if (!contextResponse.ok()) continue;
    const contextPayload = await contextResponse.json();
    const context = contextPayload.data?.data ?? contextPayload.data;
    if (context?.operation && context?.machine_type && context?.machine && context?.machine_operation_configurations?.length) {
      seededMachine = machine;
      break;
    }
  }

  expect(seededMachine, "Debe existir una máquina sembrada con contexto completo").toBeTruthy();
  await page.goto("/#/maquinas_v02");
  await expect(page.locator("main")).toBeVisible();
  const operation = seededMachine.operations?.[0];
  expect(operation, "La máquina sembrada debe conservar su identidad de operación BPM").toBeTruthy();
  const operationKey = `${operation.operation_id}|${operation.process_id}`;
  await page.locator("#machine-v02-operation").selectOption(operationKey);
  const machineRow = page.locator(`[data-machine-row="${seededMachine.id}"]`);
  await expect(machineRow).toBeVisible();
  await machineRow.click();

  const blocks = page.locator("#machine-v02-context-blocks > section");
  await expect(blocks).toHaveCount(4);
  await expect(blocks.nth(0)).toContainText("Operación");
  await expect(blocks.nth(0)).not.toContainText("Sin configuración de operación");
  await expect(blocks.nth(1)).toContainText("Tipo de máquina");
  await expect(blocks.nth(1)).not.toContainText("Sin tipo de máquina");
  await expect(blocks.nth(2)).toContainText("Máquina específica");
  await expect(blocks.nth(2)).not.toContainText("Sin detalle de máquina");
  await expect(blocks.nth(3)).toContainText("Configuración máquina–operación");
  await expect(blocks.nth(3)).not.toContainText("No existe configuración para esta operación");
});

test("req12: el contexto mantiene operation_id y process_id seleccionados", async ({ page }) => {
  const machinesResponse = await page.request.get("/api/bpm/operational/machines");
  expect(machinesResponse.ok()).toBe(true);
  const machinesPayload = await machinesResponse.json();
  const machines = machinesPayload.data?.data ?? machinesPayload.data ?? [];
  const machine = machines.find((item) => item.operations?.length);
  test.skip(!machine, "El fixture no contiene configuraciones máquina–operación");

  const selected = machine.operations[0];
  const response = await page.request.get(
    `/api/bpm/operational/machines/${machine.id}/context?operation_id=${selected.operation_id}&process_id=${selected.process_id}`,
  );
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  const context = payload.data?.data ?? payload.data;
  expect(context.operation.operation_id).toBe(selected.operation_id);
  expect(context.operation.process_id).toBe(selected.process_id);
  expect(context.machine_operation_configurations).toHaveLength(1);
  expect(context.machine_operation_configurations[0].operation_id).toBe(selected.operation_id);
  expect(context.machine_operation_configurations[0].process_id).toBe(selected.process_id);
});

test("req12: PSA1 guarda una etapa y subetapa desde Gestionar máquina", async ({ page }) => {
  test.setTimeout(30000);
  const response = await page.request.get("/api/bpm/operational/machines");
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  const machines = payload.data?.data ?? payload.data ?? [];
  const psa1 = machines.find((machine) => machine.name === "PSA1");
  expect(psa1, "Debe existir PSA1 en el fixture BPM").toBeTruthy();
  expect(psa1.operations?.length, "PSA1 debe tener una operación BPM").toBeGreaterThan(0);

  await page.goto("/#/maquinas_v02");
  const operation = psa1.operations[0];
  await expect(page.locator("#machine-v02-process")).toBeVisible();
  const catalogRefresh = page.waitForResponse((item) => item.url().includes("/api/bpm/operational/page/maquinas"));
  await page.locator("#machine-v02-process").selectOption(String(psa1.processId));
  await catalogRefresh;
  const row = page.locator(`[data-machine-row="${psa1.id}"]`);
  await expect(row).toBeVisible();
  await row.click();
  await page.locator('[data-action="machine-modal-open"]').click();
  const modal = page.locator("#machine-v02-modal");
  await expect(modal).toBeVisible();
  await modal.locator("[data-machine-tab='machine']").click();
  await modal.locator("[data-machine-tab='type']").click();
  const typeFields = {
    "machine-v02-type-name": "Tipo PSA1 E2E",
    "machine-v02-type-technology": "Tecnología PSA1 E2E",
    "machine-v02-type-principle": "Principio PSA1 E2E",
    "machine-v02-type-general-description": "Descripción general PSA1 E2E",
    "machine-v02-type-capacity": "{\"nominal\":100}",
    "machine-v02-type-controls": "[{\"name\":\"PLC PSA1 E2E\"}]",
    "machine-v02-type-limitations": "[{\"name\":\"Límite PSA1 E2E\"}]",
    "machine-v02-type-characteristics": "[{\"name\":\"Característica PSA1 E2E\"}]",
  };
  for (const [fieldId, value] of Object.entries(typeFields)) await modal.locator(`#${fieldId}`).fill(value);
  await modal.locator("[data-machine-tab='machine']").click();
  const machineFields = {
    "machine-v02-specific-description": "Descripción específica PSA1 E2E",
    "machine-v02-specific-characteristics": "[{\"name\":\"Característica específica PSA1 E2E\"}]",
    "machine-v02-specific-parameters": "[{\"name\":\"Parámetro PSA1 E2E\",\"value\":1}]",
    "machine-v02-specific-ranges": "[{\"name\":\"Rango PSA1 E2E\",\"min\":0,\"max\":1}]",
    "machine-v02-specific-limitations": "[{\"name\":\"Limitación PSA1 E2E\"}]",
    "machine-v02-specific-instructions": "[{\"name\":\"Instrucción PSA1 E2E\"}]",
    "machine-v02-specific-differences": "[{\"name\":\"Diferencia PSA1 E2E\"}]",
  };
  for (const [fieldId, value] of Object.entries(machineFields)) await modal.locator(`#${fieldId}`).fill(value);
  await modal.locator("#machine-v02-name-field").fill("PSA1 E2E actualizado");
  const addStage = modal.locator("[data-stage-add]");
  await expect(addStage).toBeEnabled();
  await addStage.click();
  const stageName = modal.locator("[data-stage-name]").last();
  await stageName.click();
  await stageName.pressSequentially("Etapa PSA1 E2E");
  await modal.locator("[data-stage-add-substage]").last().click();
  const substageName = modal.locator("[data-substage-name]").last();
  await substageName.click();
  await substageName.pressSequentially("Subetapa PSA1 E2E");

  const patchResponse = page.waitForResponse((item) => item.url().match(/\/api\/operational\/machines\/\d+$/) && item.request().method() === "PATCH");
  await modal.locator('[data-action="machine-save"]').click();
  const saved = await patchResponse;
  const body = await saved.text();
  expect(saved.status(), body).toBe(200);
  expect(body).toContain("Etapa PSA1 E2E");
  expect(body).toContain("Subetapa PSA1 E2E");
});

test("req12: filtra máquinas por identidad de operación BPM y proceso", async ({ page }) => {
  await page.goto("/#/maquinas_v02");
  const operationFilter = page.locator("#machine-v02-operation");
  await expect(operationFilter).toBeVisible();
  const operationOptions = operationFilter.locator("option");
  if (await operationOptions.count() <= 1) {
    test.skip(true, "El fixture no contiene configuraciones máquina–operación");
  }

  const operationKey = await operationOptions.nth(1).getAttribute("value");
  expect(operationKey).toMatch(/^[0-9a-f-]+\|[0-9a-f-]+$/i);
  await operationFilter.selectOption(operationKey);
  const [operationId, processId] = operationKey.split("|");
  const machinesResponse = await page.request.get(`/api/bpm/operational/machines?operation_id=${operationId}&process_id=${processId}`);
  expect(machinesResponse.ok()).toBe(true);
  const payload = await machinesResponse.json();
  const machines = payload.data?.data ?? payload.data ?? [];
  expect(machines.length).toBeGreaterThan(0);
  for (const machine of machines) {
    expect(machine.operationIds).toContain(operationId);
  }
});

test("req12: cascada proceso-operación conserva el proceso canónico", async ({ page }) => {
  await page.goto("/#/maquinas_v02");
  const processFilter = page.locator("#machine-v02-process");
  const operationFilter = page.locator("#machine-v02-operation");
  await expect(processFilter).toBeVisible();
  await expect(operationFilter).toBeVisible();
  if (await processFilter.locator("option").count() <= 1 || await operationFilter.locator("option").count() <= 1) {
    test.skip(true, "El fixture no contiene opciones suficientes para comprobar la cascada");
  }

  const processValue = await processFilter.locator("option").nth(1).getAttribute("value");
  await processFilter.selectOption(processValue);
  const visibleOperationValues = await operationFilter.locator("option").evaluateAll(
    (options) => options.slice(1).map((option) => option.value),
  );
  expect(visibleOperationValues.every((value) => value.includes("|"))).toBe(true);
  const operationValue = visibleOperationValues[0];
  const requestPromise = page.waitForRequest((request) => (
    request.url().includes("/api/bpm/operational/page/maquinas")
    && request.url().includes("operation_id=")
    && request.url().includes("process_id=")
  ));
  await operationFilter.selectOption(operationValue);
  const request = await requestPromise;
  const params = new URL(request.url()).searchParams;
  expect(params.get("processId")).toBe(processValue);
  expect(params.get("process_id")).toMatch(/^[0-9a-f-]{36}$/i);
  expect(params.get("operation_id")).toBe(operationValue.split("|")[0]);
  expect(params.get("process_id")).toBe(operationValue.split("|")[1]);
});
