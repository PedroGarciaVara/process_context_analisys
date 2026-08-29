import { test, expect } from "@playwright/test";

const process = { process_id: "e2e-process", process_code: "E2E_PROCESS", name: "Proceso E2E", nodes: [{ node_id: "e2e-input", process_id: "e2e-process", node_code: "IN", node_type: "input", name: "Entrada" }], transitions: [] };

function mockProcessApi(page) {
  page.route("**/api/bootstrap", (route) => route.fulfill({ json: { app_name: "test" } }));
  page.route("**/api/bpm/operational/catalog", (route) => route.fulfill({ json: { defaults: {} } }));
  page.route("**/api/bpm/processes", (route) => route.fulfill({ json: { status: "ok", data: [process] } }));
  page.route("**/api/bpm/processes/e2e-process", (route) => route.fulfill({ json: { status: "ok", data: process } }));
}

test("Inicio muestra el acceso visible a modelado de procesos", async ({ page }) => {
  await page.goto("/index.html#/inicio");
  await expect(page.getByRole("link", { name: "Modelado procesos" }).first()).toBeVisible();
});

test("Modelado carga el proceso canónico por process_id", async ({ page }) => {
  mockProcessApi(page);
  await page.goto("/index.html#/modelado-procesos");
  await page.locator("#pm-process-selector").selectOption("e2e-process");
  await expect(page.locator("[data-node-id='e2e-input']")).toBeVisible();
  await expect(page).toHaveURL(/process_id=e2e-process/);
});

test("La paleta crea un nodo dentro del proceso seleccionado", async ({ page }) => {
  mockProcessApi(page);
  let created;
  await page.route("**/api/bpm/processes/e2e-process/nodes-with-transition", async (route) => {
    created = { node_id: "e2e-new", process_id: "e2e-process", ...route.request().postDataJSON().node };
    process.nodes.push(created);
    await route.fulfill({ json: { status: "ok", data: { node: created, transition: { target_node_id: created.node_id } } } });
  });
  await page.goto("/index.html#/modelado-procesos?process_id=e2e-process");
  await page.locator("[data-node-id='e2e-input']").click();
  await page.locator("[data-pm-action='select-palette-node'][data-pm-palette-type='operation']").click();
  await page.locator("#pm-palette-name").fill("Operación E2E");
  await page.getByRole("button", { name: "Guardar elemento" }).click();
  await expect(page.locator("[data-node-id='e2e-new']").first()).toBeVisible();
  expect(created.process_id).toBe("e2e-process");
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
