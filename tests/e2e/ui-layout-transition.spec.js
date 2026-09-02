import { test, expect } from "@playwright/test";

const pages = [
  ["maquinas", "Maquinas"],
  ["procesos", "Procesos"],
  ["contratos", "Contratos"],
  ["operaciones", "Operaciones"],
];

test("mantiene el shell y sustituye la vista al navegar entre páginas BPM", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/#/maquinas");

  for (const [route, heading] of pages) {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1")).toHaveText(heading);
    await expect(page.locator("[data-shell-main]")).toBeVisible();
    await expect(page.locator("[data-shell-right]")).toBeVisible();

    const shell = await page.locator("body > div#app-root header").first().boundingBox();
    const sidebar = await page.locator("[data-shell-main]").evaluate((main) => main.closest("div.flex.flex-1")?.querySelector("aside")?.getBoundingClientRect().width);
    expect(shell?.height).toBe(64);
    expect(sidebar).toBe(280);
  }
});
