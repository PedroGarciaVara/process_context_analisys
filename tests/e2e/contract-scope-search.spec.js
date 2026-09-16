import { expect, test } from "@playwright/test";

test("contract creation filters process and operation scopes without inline deletion", async ({ page }) => {
  await page.goto("/index.html#/contratos");
  await expect(page.locator('[data-action="contract-create-open"]')).toBeVisible();
  await expect(page.locator('[data-action="contract-delete"]')).toHaveCount(0);

  await page.locator('[data-action="contract-create-open"]').click();
  const dialog = page.locator("#contract-create-v02-modal");
  await expect(dialog).toBeVisible();
  await dialog.locator("#contract-create-v02-scope-type").selectOption("operation");

  await dialog.locator("#contract-create-v02-process-search").fill("Preparación de productos");
  const processOptions = dialog.locator("#contract-create-v02-process-scope option");
  await expect(processOptions).toHaveCount(1);
  await expect(processOptions.first()).toHaveText("Preparación de productos químicos");
  await dialog.locator("#contract-create-v02-process-scope").selectOption({ label: "Preparación de productos químicos" });

  const operationSelect = dialog.locator("#contract-create-v02-operation-scope");
  await expect(operationSelect).toBeEnabled();
  await dialog.locator("#contract-create-v02-operation-search").fill("Dosificación");
  await expect(operationSelect.locator("option")).toHaveCount(1);
  await expect(operationSelect.locator("option").first()).toContainText("Dosificación");
});
