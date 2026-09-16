import { test, expect } from "@playwright/test";

test("la causa 307 eliminada no aparece en el árbol del contrato 3", async ({ page }) => {
  const detailResponse = await page.request.get("/api/rca-tree/causes/307");
  expect(detailResponse.ok()).toBeTruthy();
  const detail = await detailResponse.json();
  expect(detail.cause).toBeNull();

  const treeResponse = await page.request.get("/api/rca-tree/nodes?view=arbol&contract_id=3");
  expect(treeResponse.ok()).toBeTruthy();
  expect(JSON.stringify(await treeResponse.json())).not.toContain("307");

  await page.goto("/#/arboles?contract_id=3");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('[data-node-id="1690"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("307");
});
