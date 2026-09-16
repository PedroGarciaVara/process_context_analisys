import { expect, test } from "@playwright/test";

const PROCESS_ID = "f247eee0-cfa1-4ea5-b4e6-fa4598a061b5";
const PRESERVED_NODE_ID = "9a8b4bed-6cf2-56a7-8457-b2d5ddf0bfff";
const studioFrame = (page) => page.locator('iframe[title="Editor visual de procesos industriales"]').contentFrame();

async function processCatalog(request) {
  const response = await request.get("/api/bpm/processes");
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}

test("Studio keeps the complete database catalog when layout GET is unavailable", async ({ page, request }) => {
  const catalog = await processCatalog(request);
  const expected = catalog.find((process) => process.process_id === PROCESS_ID) || catalog[0];
  expect(expected).toBeTruthy();
  const detail = await request.get(`/api/bpm/processes/${expected.process_id}`);
  expect(detail.ok()).toBeTruthy();

  await page.route(`**/api/bpm/processes/${expected.process_id}/layout`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ status: "error", message: "Servicio de layout temporalmente no disponible" }) });
      return;
    }
    await route.continue();
  });
  await page.goto(`/index.html#/studio-procesos?processId=${expected.process_id}`);
  const studio = studioFrame(page);

  await expect(studio.locator("#process-title")).toHaveValue(expected.name);
  await expect(studio.locator("#db-process-selector")).toHaveValue(expected.process_id);
  await expect(studio.locator("#db-process-selector option")).toHaveCount(catalog.length);
  await expect(studio.locator("#database-status")).toContainText("BD · diseño automático");
  await expect(studio.locator("#database-status")).toHaveAttribute("title", /Servicio de layout temporalmente no disponible/);
  await expect(studio.locator("#toast-region")).toContainText("Proceso cargado. Se usa diseño automático");
});

test("the legacy 8050 backend shows every process despite its layout 404", async ({ page, request, baseURL }) => {
  test.skip(!String(baseURL).includes(":8050"), "Este escenario reproduce específicamente el backend histórico de 8050.");
  const catalog = await processCatalog(request);
  const expected = catalog.find((process) => process.process_id === PROCESS_ID);
  expect(expected).toBeTruthy();
  const layout = await request.get(`/api/bpm/processes/${PROCESS_ID}/layout`);
  expect(layout.status()).toBe(404);

  await page.goto(`/index.html#/studio-procesos?processId=${PROCESS_ID}`);
  const studio = studioFrame(page);
  await expect(studio.locator("#db-process-selector option")).toHaveCount(catalog.length);
  await expect(studio.locator("#db-process-selector")).toHaveValue(PROCESS_ID);
  await expect(studio.locator("#process-title")).toHaveValue(expected.name);
  await expect(studio.locator("#database-status")).toContainText("BD · diseño automático");
  await expect(studio.locator(`[data-node-id="${PRESERVED_NODE_ID}"]`)).toBeVisible();
});

test("a catalog failure remains visible and does not masquerade as layout degradation", async ({ page }) => {
  await page.route("**/api/bpm/processes", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ status: "error", message: "Catálogo BPM no disponible" }) });
      return;
    }
    await route.continue();
  });
  await page.goto("/index.html#/studio-procesos");
  const studio = studioFrame(page);
  await expect(studio.locator("#database-status")).toContainText("Modo local");
  await expect(studio.locator("#database-status")).toHaveAttribute("title", /Catálogo BPM no disponible/);
  await expect(studio.locator("#db-process-selector option")).toHaveCount(1);
  await expect(studio.locator("#toast-region")).toContainText("No se pudo leer la base de datos: Catálogo BPM no disponible");
});

test("a process detail failure remains visible and does not become a layout warning", async ({ page, request }) => {
  const catalog = await processCatalog(request);
  const expected = catalog.find((process) => process.process_id === PROCESS_ID) || catalog[0];
  await page.route(`**/api/bpm/processes/${expected.process_id}`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ status: "error", message: "Detalle BPM no disponible" }) });
      return;
    }
    await route.continue();
  });
  await page.goto(`/index.html#/studio-procesos?processId=${expected.process_id}`);
  const studio = studioFrame(page);
  await expect(studio.locator("#database-status")).toContainText("Modo local");
  await expect(studio.locator("#database-status")).toHaveAttribute("title", /Detalle BPM no disponible/);
  await expect(studio.locator("#db-process-selector option")).toHaveCount(1);
  await expect(studio.locator("#toast-region")).toContainText("No se pudo leer la base de datos: Detalle BPM no disponible");
});
