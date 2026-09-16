import { expect, test } from "@playwright/test";

async function createProcessWithNodes(request, label, count = 3) {
  const processResponse = await request.post("/api/bpm/processes", { data: { name: `${label} ${Date.now()}` } });
  expect(processResponse.status()).toBe(201);
  const process = (await processResponse.json()).data;
  const nodes = [];
  for (let index = 0; index < count; index += 1) {
    const response = await request.post(`/api/bpm/processes/${process.process_id}/nodes`, {
      data: { node_type: "operation", name: `Operación ${index + 1}` },
    });
    expect(response.status()).toBe(201);
    nodes.push((await response.json()).data);
  }
  return { process, nodes };
}

test("alignment is shared through PostgreSQL and auto-layout clears the overrides", async ({ page, request, browser }) => {
  const { process, nodes } = await createProcessWithNodes(request, "E2E shared layout");
  try {
    await page.goto(`/bpm-studio.html?processId=${process.process_id}`);
    const cards = nodes.map((node) => page.locator(`[data-node-id="${node.node_id}"]`));
    await expect(cards[0]).toBeVisible();
    await cards[0].click();
    await cards[1].click({ modifiers: ["Control"] });
    await cards[2].click({ modifiers: ["Control"] });

    const persisted = page.waitForResponse((response) => response.url().endsWith(`/api/bpm/processes/${process.process_id}/layout`) && response.request().method() === "PUT" && response.ok());
    await page.locator('[data-align="top"]').click();
    await persisted;

    const layoutResponse = await request.get(`/api/bpm/processes/${process.process_id}/layout`);
    const layout = (await layoutResponse.json()).data.positions;
    expect(layout).toHaveLength(3);
    expect(new Set(layout.map((item) => item.y)).size).toBe(1);

    const cleanContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
    const cleanPage = await cleanContext.newPage();
    await cleanPage.goto(`/bpm-studio.html?processId=${process.process_id}`);
    const renderedTops = await Promise.all(nodes.map((node) => cleanPage.locator(`[data-node-id="${node.node_id}"]`).evaluate((element) => Number.parseFloat(element.style.top))));
    expect(new Set(renderedTops).size).toBe(1);

    const cleared = cleanPage.waitForResponse((response) => response.url().endsWith(`/api/bpm/processes/${process.process_id}/layout`) && response.request().method() === "PUT" && response.ok());
    await cleanPage.locator('[data-action="auto-layout"]').click();
    await cleared;
    expect((await (await request.get(`/api/bpm/processes/${process.process_id}/layout`)).json()).data.positions).toEqual([]);
    await cleanContext.close();
  } finally {
    await request.delete(`/api/bpm/processes/${process.process_id}?cascade=true`);
  }
});

test("legacy browser positions require confirmation before becoming shared", async ({ page, request }) => {
  const { process, nodes } = await createProcessWithNodes(request, "E2E legacy layout", 1);
  const key = `uc-bib-industrial-flow-studio-v1:positions:${process.process_id}`;
  try {
    await page.addInitScript(({ storageKey, nodeId }) => {
      localStorage.setItem(storageKey, JSON.stringify({ [nodeId]: { x: 444, y: 222 }, stale: { x: 1, y: 2 } }));
    }, { storageKey: key, nodeId: nodes[0].node_id });
    await page.goto(`/bpm-studio.html?processId=${process.process_id}`);
    await expect(page.locator("#layout-migration-dialog")).toBeVisible();
    await expect(page.locator("#layout-migration-summary")).toContainText("1 referencias antiguas");

    const imported = page.waitForResponse((response) => response.url().endsWith(`/api/bpm/processes/${process.process_id}/layout`) && response.request().method() === "PUT" && response.ok());
    await page.locator('[data-action="import-legacy-layout"]').click();
    await imported;
    await expect(page.locator("#layout-migration-dialog")).toBeHidden();
    expect((await (await request.get(`/api/bpm/processes/${process.process_id}/layout`)).json()).data.positions).toEqual([
      { node_id: nodes[0].node_id, x: 444, y: 222 },
    ]);
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
    expect(await page.evaluate((storageKey) => localStorage.getItem(`${storageKey}:backup`), key)).toBeTruthy();
  } finally {
    await request.delete(`/api/bpm/processes/${process.process_id}?cascade=true`);
  }
});
