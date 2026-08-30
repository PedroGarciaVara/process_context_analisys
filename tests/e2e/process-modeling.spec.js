import { test, expect } from "@playwright/test";

const processId = "11111111-1111-4111-8111-111111111111";
const inputNodeId = "22222222-2222-4222-8222-222222222222";
const newNodeId = "33333333-3333-4333-8333-333333333333";
const createdProcessId = "44444444-4444-4444-8444-444444444444";
const process = { process_id: processId, process_code: "E2E_PROCESS", name: "Proceso E2E", nodes: [{ node_id: inputNodeId, process_id: processId, node_code: "IN", node_type: "input", name: "Entrada" }], transitions: [] };

function mockProcessApi(page) {
  page.route("**/api/bootstrap", (route) => route.fulfill({ json: { app_name: "test" } }));
  page.route("**/api/bpm/operational/catalog", (route) => route.fulfill({ json: { defaults: {} } }));
  page.route("**/api/bpm/processes", (route) => route.fulfill({ json: { status: "ok", data: [process] } }));
  page.route(`**/api/bpm/processes/${processId}`, (route) => route.fulfill({ json: { status: "ok", data: process } }));
}

test("Inicio muestra el acceso visible a modelado de procesos", async ({ page }) => {
  await page.goto("/index.html#/inicio");
  await expect(page.getByRole("link", { name: "Modelado procesos" }).first()).toBeVisible();
});

test("Modelado carga el proceso canónico por process_id", async ({ page }) => {
  mockProcessApi(page);
  await page.goto("/index.html#/modelado-procesos");
  await page.locator("#pm-process-selector").selectOption(processId);
  await expect(page.locator(`[data-node-id='${inputNodeId}']`)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`process_id=${processId}`));
});

test("La paleta crea un nodo dentro del proceso seleccionado", async ({ page }) => {
  mockProcessApi(page);
  let created;
  await page.route(`**/api/bpm/processes/${processId}/nodes-with-transition`, async (route) => {
    created = { node_id: newNodeId, process_id: processId, ...route.request().postDataJSON().node };
    process.nodes.push(created);
    await route.fulfill({ json: { status: "ok", data: { node: created, transition: { target_node_id: created.node_id } } } });
  });
  await page.goto(`/index.html#/modelado-procesos?process_id=${processId}`);
  await page.locator(`[data-node-id='${inputNodeId}']`).click();
  await page.locator("[data-pm-action='select-palette-node'][data-pm-palette-type='operation']").click();
  await page.locator("#pm-palette-name").fill("Operación E2E");
  await page.getByRole("button", { name: "Guardar elemento" }).click();
  await expect(page.locator(`[data-node-id='${newNodeId}']`).first()).toBeVisible();
  expect(created.process_id).toBe(processId);
});

test("Crear proceso desde la interfaz usa el UUID generado por el servidor", async ({ page }) => {
  mockProcessApi(page);
  let requestPayload;
  await page.route("**/api/bpm/processes", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requestPayload = route.request().postDataJSON();
    await route.fulfill({ json: { status: "ok", data: { ...process, process_id: createdProcessId, process_code: "PROC-001", name: "Proceso nuevo" } } });
  });

  await page.goto("/index.html#/modelado-procesos");
  await page.locator("#pm-process-code").fill("PROC-001");
  await page.locator("#pm-process-name").fill("Proceso nuevo");
  await page.getByRole("button", { name: "Crear proceso" }).click();

  await expect(page.locator("#pm-message")).toHaveText("Proceso guardado.");
  expect(requestPayload).toEqual({ process_code: "PROC-001", name: "Proceso nuevo" });
  expect(requestPayload).not.toHaveProperty("process_id");
});

test("La API real de proceso conserva nodos y transiciones sin versiones", async ({ request }) => {
  const response = await request.get("/api/bpm/processes");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  for (const item of payload.data || []) {
    expect(item).not.toHaveProperty("versions");
    expect(item.process_id).toBeTruthy();
  }
});

test("La selección de un proceso real no muestra un error de UUID", async ({ page }) => {
  await page.goto("/index.html#/modelado-procesos");
  const selector = page.locator("#pm-process-selector");
  await expect(selector.locator("option").nth(1)).toBeAttached();
  await selector.selectOption({ index: 1 });
  await expect(page.locator("#pm-message")).not.toHaveText("process_id debe ser un UUID válido");
  await expect(page).toHaveURL(/process_id=[0-9a-f-]{36}/i);
});
