import { test, expect } from "@playwright/test";

test("permite seleccionar cualquier tarjeta del arbol causal", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/#/arboles");
  const cards = page.locator(".acv2-tree-node-button");
  await expect(cards).toHaveCount(9);

  const selectedCards = page.locator(".acv2-tree-card-active");
  await cards.nth(0).click();
  await expect(selectedCards).toHaveCount(1);
  const firstNodeId = await cards.nth(0).getAttribute("data-node-id");
  await expect(selectedCards.first()).toContainText("Causa");
  expect(firstNodeId).toBeTruthy();

  for (const index of [1, 4, 8]) {
    const nodeId = await cards.nth(index).getAttribute("data-node-id");
    expect(nodeId).toBeTruthy();
    await cards.nth(index).click();
    await expect(selectedCards).toHaveCount(1);
    await expect(page.locator(`[data-node-id="${nodeId}"] .acv2-tree-card`)).toHaveClass(/acv2-tree-card-active/);
  }

  expect(consoleErrors).toEqual([]);
});
