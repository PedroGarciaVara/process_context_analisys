import { expect, test } from "@playwright/test";

const ROOT_PROCESS_ID = "06757b45-a08d-4493-8012-db03325399c8";
const LOAD_PROCESS_ID = "f247eee0-cfa1-4ea5-b4e6-fa4598a061b5";
const LOAD_OPERATION_ID = "9a8b4bed-6cf2-56a7-8457-b2d5ddf0bfff";
const studioFrame = (page) => page.locator('iframe[title="Editor visual de procesos industriales"]').contentFrame();

test("the canonical Studio route loads the requested process context", async ({ page }) => {
  await page.goto(`/index.html#/studio-procesos?processId=${ROOT_PROCESS_ID}`);
  await expect(page).toHaveURL(new RegExp(`#\/studio-procesos\\?processId=${ROOT_PROCESS_ID}`));
  const studio = studioFrame(page);
  await expect(studio.locator("#process-title")).toHaveValue("Fabricación de mezclas de caucho para neumáticos");
  await expect(studio.locator("#db-process-selector")).toHaveValue(ROOT_PROCESS_ID);
});

test("Studio creates and validates a process from the working page", async ({ page, request }) => {
  test.setTimeout(30_000);
  let createdId = "";
  try {
    await page.goto("/index.html#/studio-procesos?new=1");
    const studio = studioFrame(page);
    await expect(studio.locator("#process-create-dialog")).toBeVisible();
    const name = `E2E Studio parity ${Date.now()}`;
    await studio.locator("#new-process-name").fill(name);
    await studio.locator("#new-process-description").fill("Proceso creado desde la página BPM canónica");
    const createdResponse = page.waitForResponse((response) => response.url().endsWith("/api/bpm/processes") && response.request().method() === "POST" && response.status() === 201);
    await studio.locator('#process-create-form [type="submit"]').click();
    createdId = (await (await createdResponse).json()).data.process_id;
    await expect(studio.locator("#process-title")).toHaveValue(name);
    await expect(studio.locator("#db-process-selector")).toHaveValue(createdId);

    const validationResponse = page.waitForResponse((response) => response.url().includes(`/api/bpm/processes/${createdId}/validate`) && response.request().method() === "POST");
    await studio.locator('[data-action="validate"]').click();
    await validationResponse;
    await expect(studio.locator("#validation-dialog")).toBeVisible();
    await studio.locator('#validation-dialog [data-action="close-dialog"]').last().click();
    await expect(studio.locator("#validation-dialog")).toBeHidden();

    await studio.locator('[data-action="toggle-fullscreen"]').click();
    await expect.poll(() => studio.locator(".canvas-panel").evaluate((element) => document.fullscreenElement === element || element.classList.contains("is-focus-mode"))).toBeTruthy();
    await studio.locator('[data-action="toggle-fullscreen"]').click();
  } finally {
    if (createdId) await request.delete(`/api/bpm/processes/${createdId}?cascade=true`);
  }
});

test("Studio redirects nodes and business entities to fully loaded detail pages", async ({ page, request }) => {
  test.setTimeout(35_000);
  const loadProcess = (await (await request.get(`/api/bpm/processes/${LOAD_PROCESS_ID}`)).json()).data;
  const operation = loadProcess.nodes.find((node) => node.node_id === LOAD_OPERATION_ID);
  expect(operation).toBeTruthy();

  await page.goto(`/index.html#/studio-procesos?processId=${LOAD_PROCESS_ID}&selectedNodeId=${operation.node_id}`);
  let studio = studioFrame(page);
  await expect(studio.locator(`[data-node-id="${operation.node_id}"]`)).toHaveClass(/is-selected/);
  await studio.locator(`[data-open-operation-detail="${operation.node_id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`#\/operaciones_detalle\\?process_id=${LOAD_PROCESS_ID}&node_id=${operation.node_id}`));
  await expect(page.locator("#operation-detail-form")).toBeVisible();
  await expect(page.locator('#operation-detail-form input[name="name"]')).toHaveValue(operation.name);

  const root = (await (await request.get(`/api/bpm/processes/${ROOT_PROCESS_ID}`)).json()).data;
  const subprocess = root.nodes.find((node) => node.name === "Preparación de productos químicos");
  await page.goto(`/index.html#/studio-procesos?processId=${ROOT_PROCESS_ID}&selectedNodeId=${subprocess.node_id}`);
  studio = studioFrame(page);
  await studio.locator(`[data-open-process-record="${subprocess.child_process_id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`#\/procesos_detalle\\?bpm_process_id=${subprocess.child_process_id}`));
  await expect(page.locator("#process-page-form")).toBeVisible();
  await expect(page.locator("#process-page-name")).toHaveValue(subprocess.name);

  await page.goto(`/index.html#/studio-procesos?processId=${LOAD_PROCESS_ID}&selectedNodeId=${operation.node_id}`);
  studio = studioFrame(page);
  await studio.locator('[data-inspector-tab="context"]').click();
  const machineLink = studio.locator("[data-open-machine-detail]").first();
  const machineId = await machineLink.getAttribute("data-open-machine-detail");
  await machineLink.click();
  await expect(page).toHaveURL(new RegExp(`#\/maquinas_detalle\\?machine_id=${machineId}`));
  await expect(page.locator("#machine-detail-form")).toBeVisible();

  await page.goto(`/index.html#/studio-procesos?processId=${LOAD_PROCESS_ID}&selectedNodeId=${operation.node_id}`);
  studio = studioFrame(page);
  await studio.locator('[data-inspector-tab="context"]').click();
  const contractLink = studio.locator("[data-open-contract-detail]");
  const contractId = await contractLink.getAttribute("data-open-contract-detail");
  await contractLink.click();
  await expect(page).toHaveURL(new RegExp(`#\/contratos_detalle\\?contract_id=${contractId}`));
  await expect(page.locator("#contract-detail-page-form")).toBeVisible();
});

test("Studio deletes an operation and reconnects its graph", async ({ page, request }) => {
  test.setTimeout(30_000);
  const processResponse = await request.post("/api/bpm/processes", { data: { name: `E2E Studio reconnect ${Date.now()}` } });
  const process = (await processResponse.json()).data;
  try {
    const input = (await (await request.post(`/api/bpm/processes/${process.process_id}/nodes`, { data: { node_type: "input", name: "Entrada" } })).json()).data;
    const operation = (await (await request.post(`/api/bpm/processes/${process.process_id}/nodes`, { data: { node_type: "operation", name: "Operación eliminable" } })).json()).data;
    const output = (await (await request.post(`/api/bpm/processes/${process.process_id}/nodes`, { data: { node_type: "output", name: "Salida", output_role: "normal" } })).json()).data;
    await request.post(`/api/bpm/processes/${process.process_id}/transitions`, { data: { source_node_id: input.node_id, target_node_id: operation.node_id, transition_type: "sequence" } });
    await request.post(`/api/bpm/processes/${process.process_id}/transitions`, { data: { source_node_id: operation.node_id, target_node_id: output.node_id, transition_type: "sequence" } });

    await page.goto(`/index.html#/studio-procesos?processId=${process.process_id}&selectedNodeId=${operation.node_id}`);
    const studio = studioFrame(page);
    await studio.locator('[data-inspector-tab="relations"]').click();
    page.once("dialog", (dialog) => dialog.accept());
    const deleteResponse = page.waitForResponse((response) => response.url().endsWith(`/api/bpm/nodes/${operation.node_id}/operation-delete`) && response.request().method() === "POST");
    await studio.locator('[data-action="delete-selected"]').click();
    await deleteResponse;
    await expect(studio.locator(`[data-node-id="${operation.node_id}"]`)).toHaveCount(0);

    const graph = (await (await request.get(`/api/bpm/processes/${process.process_id}`)).json()).data;
    expect(graph.nodes).toHaveLength(2);
    expect(graph.diagram_transitions).toHaveLength(1);
    expect(graph.diagram_transitions[0].source_node_id).toBe(input.node_id);
    expect(graph.diagram_transitions[0].target_node_id).toBe(output.node_id);
  } finally {
    await request.delete(`/api/bpm/processes/${process.process_id}?cascade=true`);
  }
});
