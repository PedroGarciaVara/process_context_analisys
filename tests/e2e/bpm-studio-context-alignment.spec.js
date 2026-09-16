import { expect, test } from "@playwright/test";

const PROCESS_ID = "f247eee0-cfa1-4ea5-b4e6-fa4598a061b5";
const DOSAGE_OPERATION_ID = "9a8b4bed-6cf2-56a7-8457-b2d5ddf0bfff";
const ROOT_PROCESS_ID = "06757b45-a08d-4493-8012-db03325399c8";

test("business context lens and alignment work on a stored industrial flow", async ({ page, request }, testInfo) => {
  const response = await request.get(`/api/bpm/processes/${PROCESS_ID}`);
  expect(response.ok()).toBeTruthy();
  const envelope = await response.json();
  const operation = envelope.data.nodes.find((node) => node.node_id === DOSAGE_OPERATION_ID);
  expect(operation).toBeTruthy();
  const operations = [operation, ...envelope.data.nodes.filter((node) => node.node_id !== DOSAGE_OPERATION_ID)].slice(0, 3);
  expect(operations).toHaveLength(3);

  await page.goto(`/bpm-studio.html?processId=${PROCESS_ID}`);
  await expect(page.locator(`[data-node-id="${operations[0].node_id}"]`)).toBeVisible();

  const originalLayout = (await (await request.get(`/api/bpm/processes/${PROCESS_ID}/layout`)).json()).data.positions;
  const selectedIds = new Set(operations.map((node) => node.node_id));
  const remaining = envelope.data.nodes.filter((node) => !selectedIds.has(node.node_id));
  const testPositions = [
    ...operations.map((node, index) => ({ node_id: node.node_id, x: 240 + (index * 360), y: 160 + (index * 150) })),
    ...remaining.map((node, index) => ({
      node_id: node.node_id,
      x: 180 + ((index % 5) * 360),
      y: 680 + (Math.floor(index / 5) * 240),
    })),
  ];
  const positioned = await request.put(`/api/bpm/processes/${PROCESS_ID}/layout`, { data: { positions: [
    ...testPositions,
  ] } });
  expect(positioned.ok()).toBeTruthy();
  try {
    await page.reload();

    const first = page.locator(`[data-node-id="${operations[0].node_id}"]`);
    const second = page.locator(`[data-node-id="${operations[1].node_id}"]`);
    const third = page.locator(`[data-node-id="${operations[2].node_id}"]`);
    await expect(first).toBeVisible();
    await first.click();
    await second.click({ modifiers: ["Control"] });
    await third.click({ modifiers: ["Control"] });
    await expect(page.locator("#selection-toolbar")).toBeVisible();
    await expect(page.locator("#selection-count")).toHaveText("3 seleccionados");

    await page.locator('[data-align="top"]').click();
    await page.waitForTimeout(400);
    const alignedTops = await Promise.all([first, second, third].map((node) => node.evaluate((element) => Number.parseFloat(element.style.top))));
    expect(new Set(alignedTops).size).toBe(1);

    await page.locator('[data-inspector-tab="context"]').click();
    await expect(page.locator(".context-loading")).toBeHidden({ timeout: 10_000 });
    await expect(page.locator(".context-hero")).toContainText("Dosificar las cargas reforzantes");
    await expect(page.locator(".linked-entity")).toHaveCount(8);
    await expect(page.locator(".contract-card")).toContainText("impacto en TRSP");
    await expect(page.locator(".source-card")).toContainText("Procedencia verificable");

    await page.screenshot({ path: testInfo.outputPath("context-lens-and-alignment.png"), fullPage: true });
  } finally {
    const restored = await request.put(`/api/bpm/processes/${PROCESS_ID}/layout`, { data: { positions: originalLayout } });
    expect(restored.ok()).toBeTruthy();
  }
});

test("every stored BPM flow still renders after the interaction upgrade", async ({ page, request }) => {
  test.setTimeout(45_000);
  const catalogResponse = await request.get("/api/bpm/processes");
  expect(catalogResponse.ok()).toBeTruthy();
  const catalog = (await catalogResponse.json()).data;
  expect(catalog.length).toBeGreaterThan(0);

  const rendered = [];
  for (const process of catalog) {
    const detailResponse = await request.get(`/api/bpm/processes/${process.process_id}`);
    expect(detailResponse.ok()).toBeTruthy();
    const detail = (await detailResponse.json()).data;
    await page.goto(`/bpm-studio.html?processId=${process.process_id}`);
    await expect(page.locator("#process-title")).toHaveValue(process.name);
    await expect(page.locator(".flow-node")).toHaveCount(detail.nodes.length);
    await expect(page.locator(".edge-group")).toHaveCount((detail.diagram_transitions || detail.transitions || []).length);
    rendered.push(process.process_id);
  }
  expect(rendered).toHaveLength(catalog.length);
});

test("a subprocess node opens its own graph and returns to its parent", async ({ page, request }, testInfo) => {
  const rootResponse = await request.get(`/api/bpm/processes/${ROOT_PROCESS_ID}`);
  expect(rootResponse.ok()).toBeTruthy();
  const root = (await rootResponse.json()).data;
  const subprocess = root.nodes.find((node) => node.name === "Preparación de productos químicos");
  expect(subprocess?.child_process_id).toBeTruthy();

  const childResponse = await request.get(`/api/bpm/processes/${subprocess.child_process_id}`);
  expect(childResponse.ok()).toBeTruthy();
  const child = (await childResponse.json()).data;

  await page.goto(`/bpm-studio.html?processId=${ROOT_PROCESS_ID}`);
  const openButton = page.locator(`[data-open-subprocess="${subprocess.node_id}"]`).first();
  await expect(openButton).toBeVisible();
  await openButton.click();

  await expect(page.locator("#process-title")).toHaveValue(child.name);
  await expect(page.locator("#db-process-selector")).toHaveValue(String(subprocess.child_process_id));
  await expect(page.locator(".flow-node")).toHaveCount(child.nodes.length);
  await expect(page.locator("#process-path")).toContainText(root.name);
  await expect(page.locator("#process-back")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("subprocess-child-graph.png"), fullPage: true });

  await page.locator("#process-back").click();
  await expect(page.locator("#process-title")).toHaveValue(root.name);
  await expect(page.locator(".flow-node")).toHaveCount(root.nodes.length);
  await expect(page.locator("#process-back")).toBeHidden();
});
