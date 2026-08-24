import { test, expect } from "@playwright/test";

const unique = (prefix) => `${prefix}-${Date.now()}`;

test("rechaza crear procesos operativos fuera del modelado BPM", async ({ page }) => {
  test.setTimeout(60_000);
  const processResponse = await page.request.post("/api/operational/processes", { data: { name: unique("Proceso operativo") } });
  expect(processResponse.status()).toBe(400);
});
