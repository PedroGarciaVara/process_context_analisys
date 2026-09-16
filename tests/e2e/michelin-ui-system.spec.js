import { test, expect } from "@playwright/test";

const PROCESS_ID = "abfead18-386d-4f27-9957-4b24da26716d";
const OPERATION_ID = "c5160c36-2e05-5fbd-ba9b-61b89a7928bc";

const routes = [
  ["inicio", "/#/inicio", "Bienvenido de nuevo"],
  ["maquinas", "/#/maquinas", "Maquinas"],
  ["maquina-detalle", "/#/maquinas_detalle?machine_id=5", "BA01"],
  ["procesos", "/#/procesos", "Procesos"],
  ["proceso-detalle", `/#/procesos_detalle?bpm_process_id=${PROCESS_ID}`, "Preparación de productos químicos"],
  ["operaciones", "/#/operaciones", "Operaciones"],
  ["operacion-detalle", `/#/operaciones_detalle?process_id=${PROCESS_ID}&node_id=${OPERATION_ID}`, "Dosificación"],
  ["contratos", "/#/contratos", "Contratos"],
  ["contrato-detalle", "/#/contratos_detalle?contract_id=3", "dosificacion fuera tolerancia"],
  ["arbol", "/#/arboles?contract_id=3", "Arbol"],
  ["analisis", "/#/analisis_causas?contract_id=3&analysis_id=39", "Análisis"],
  ["causa-detalle", "/#/causa_detalle?contrato_id=2&causa_id=45", "Editor de causa"],
  ["contexto", "/#/contexto", "Consulta BPM"],
];

test.describe("sistema visual Michelin", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  for (const [name, route, expectedText] of routes) {
    test(`${name}: conserva contenido y adopta el marco común`, async ({ page }, testInfo) => {
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText(expectedText, { exact: false }).first()).toBeVisible();
      await expect(page.locator(".michelin-topbar")).toBeVisible();
      await expect(page.locator(".michelin-nav-rail")).toBeVisible();
      await expect(page.locator("body")).toHaveCSS("font-family", /Noto Sans/);

      const railBox = await page.locator(".michelin-nav-rail").boundingBox();
      expect(railBox?.width).toBeGreaterThanOrEqual(100);
      expect(railBox?.width).toBeLessThanOrEqual(106);
      await expect(page.locator(".michelin-nav-item").first()).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
      expect(pageErrors).toEqual([]);
    });
  }

  test("árbol y análisis reservan un inspector lateral amplio", async ({ page }) => {
    for (const route of ["/#/arboles?contract_id=3", "/#/analisis_causas?contract_id=3&analysis_id=39"]) {
      await page.goto(route);
      await expect(page.locator(".michelin-context-panel")).toBeVisible();
      const panelBox = await page.locator(".michelin-context-panel").boundingBox();
      expect(panelBox?.width).toBeGreaterThanOrEqual(380);
      await expect(page.locator(".acv2-canvas-shell")).toBeVisible();
    }
  });

  test("Studio conserva su editor y adopta la paleta Michelin", async ({ page }, testInfo) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/#/studio-procesos");

    const frame = page.frameLocator(".bpm-studio-frame");
    await expect(frame.locator(".studio-shell")).toBeVisible();
    await expect(frame.locator(".topbar")).toHaveCSS("background-color", "rgb(0, 12, 52)");
    await expect(frame.locator(".button-primary").first()).toHaveCSS("background-color", "rgb(252, 229, 0)");
    await expect(frame.locator("body")).toHaveCSS("font-family", /Noto Sans/);
    await page.screenshot({ path: testInfo.outputPath("studio-procesos.png"), fullPage: true });
    expect(pageErrors).toEqual([]);
  });

  test("Studio permite volver a Inicio y navegar al resto del producto", async ({ page }) => {
    await page.goto("/#/studio-procesos");
    let frame = page.frameLocator(".bpm-studio-frame");
    await expect(frame.locator(".studio-product-nav")).toBeVisible();
    await frame.locator('.studio-nav-trigger[aria-label="Ir a Inicio"]').click();
    await expect(page).toHaveURL(/#\/inicio$/);
    await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();

    await page.goto("/#/studio-procesos");
    frame = page.frameLocator(".bpm-studio-frame");
    await frame.locator(".studio-nav-menu summary").click();
    await expect(frame.locator(".studio-nav-popover")).toBeVisible();
    await expect(frame.locator(".studio-nav-popover a")).toHaveCount(8);
    await frame.getByRole("link", { name: "Máquinas" }).click();
    await expect(page).toHaveURL(/#\/maquinas$/);
    await expect(page.locator("[data-machine-row]").first()).toBeVisible();
  });
});
