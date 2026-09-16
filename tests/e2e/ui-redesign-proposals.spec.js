import { expect, test } from "@playwright/test";

test.describe("auditoría y propuestas visuales Michelin", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("captura las tres vistas actuales después del montaje real", async ({ page }, testInfo) => {
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const views = [
      ["inicio", "/#/inicio", "Bienvenido de nuevo"],
      ["maquinas", "/#/maquinas", "Maquinas"],
      ["maquina-detalle", "/#/maquinas_detalle?machine_id=5", "BA01"],
    ];

    for (const [name, url, heading] of views) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible({ timeout: 12_000 });
      await page.screenshot({ path: testInfo.outputPath(`${name}-actual.png`), fullPage: true });
    }

    expect(consoleErrors).toEqual([]);
  });

  test("renderiza doce estados de propuesta sin errores", async ({ page }, testInfo) => {
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/ui-redesign-proposals.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-proposal='hybrid']")).toBeVisible();

    const concepts = [
      ["command", "Control de planta"],
      ["route", "Ruta operativa"],
      ["precision", "Precisión técnica"],
      ["hybrid", "Dirección combinada"],
    ];
    const screens = ["home", "machines", "detail"];

    for (const [concept, label] of concepts) {
      await page.getByRole("tab", { name: new RegExp(label) }).click();
      for (const screen of screens) {
        await page.locator(`[data-screen='${screen}']`).click();
        await expect(page.locator(`[data-proposal='${concept}'][data-proposal-screen='${screen}']`)).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${concept}-${screen}.png`), fullPage: true });
      }
    }

    expect(consoleErrors).toEqual([]);
  });
});
