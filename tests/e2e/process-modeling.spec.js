import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const testCode = `TEST_PM_E2E_${Date.now()}`;
const testName = "Proceso E2E de modelado";
let createdProcessId;

test.afterAll(() => {
  if (!createdProcessId) return;
  execFileSync("python3", ["scripts/cleanup_process_modeling_e2e.py", createdProcessId], { stdio: "inherit" });
});

async function jsonRequest(request, method, url, data) {
  const response = await request[method](url, data ? { data } : undefined);
  const body = await response.json();
  expect(response.ok(), `${method} ${url}: ${JSON.stringify(body)}`).toBeTruthy();
  return body.data;
}

async function selectProcess(page, processId) {
  await page.locator("#pm-process-selector").selectOption(processId);
}

async function selectProcessByCode(page, processCode) {
  const option = page.locator("#pm-process-selector option").filter({ hasText: processCode }).first();
  await selectProcess(page, await option.getAttribute("value"));
}

test("Inicio muestra el acceso visible a modelado de procesos", async ({ page }) => {
  await page.goto("/index.html#/inicio");
  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
  const menuLink = page.getByRole("link", { name: "Modelado procesos" }).first();
  await expect(menuLink).toBeVisible();
  await menuLink.click();
  await expect(page).toHaveURL(/#\/modelado-procesos$/);
  await expect(page.getByRole("heading", { name: "Modelado de procesos" })).toBeVisible();
});

test("Modelado de procesos permite volver al menú inicial", async ({ page }) => {
  await page.goto("/index.html#/modelado-procesos");
  await expect(page.getByRole("link", { name: "Menú inicial" })).toBeVisible();
  await page.getByRole("link", { name: "Menú inicial" }).click();
  await expect(page).toHaveURL(/#\/inicio$/);
  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
});

test("la paleta permite seleccionar un nodo, completar el modal y conectarlo al flujo", async ({ page }) => {
  const parent = { process_id: "palette-process", process_code: "PALETTE", name: "Proceso paleta", versions: [{ version_id: "palette-v1", version_number: 1, status: "draft" }] };
  let version = {
    process: parent,
    version: { version_id: "palette-v1", version_number: 1, status: "draft" },
    nodes: [{ node_id: "palette-source", node_code: "SRC", node_type: "operation", name: "Operación origen" }],
    transitions: [],
  };
  await page.route("**/api/bootstrap", (route) => route.fulfill({ json: { app_name: "test" } }));
  await page.route("**/api/operational/catalog", (route) => route.fulfill({ json: { defaults: {} } }));
  await page.route("**/api/process-modeling/processes", (route) => route.fulfill({ json: { status: "ok", data: [parent] } }));
  await page.route("**/api/process-modeling/versions/palette-v1", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { status: "ok", data: version } });
    return route.fulfill({ json: { status: "ok", data: {} } });
  });
  await page.route("**/api/process-modeling/versions/palette-v1/nodes", async (route) => {
    expect(route.request().method()).toBe("POST");
    const requestBody = route.request().postDataJSON();
    const node = { node_id: "palette-new", ...requestBody };
    version = { ...version, nodes: [...version.nodes, node] };
    await route.fulfill({ json: { status: "ok", data: node } });
  });
  await page.route("**/api/process-modeling/nodes/palette-new", async (route) => {
    if (route.request().method() === "PATCH") {
      const update = route.request().postDataJSON();
      version = { ...version, nodes: version.nodes.map((node) => node.node_id === "palette-new" ? { ...node, ...update } : node) };
      return route.fulfill({ json: { status: "ok", data: version.nodes.find((node) => node.node_id === "palette-new") } });
    }
    if (route.request().method() === "DELETE") {
      version = { ...version, nodes: version.nodes.filter((node) => node.node_id !== "palette-new"), transitions: [] };
      return route.fulfill({ json: { status: "ok", data: { deleted: true, node_id: "palette-new" } } });
    }
    return route.continue();
  });
  await page.route("**/api/process-modeling/versions/palette-v1/transitions", async (route) => {
    expect(route.request().method()).toBe("POST");
    const requestBody = route.request().postDataJSON();
    version = { ...version, transitions: [{ transition_id: "palette-edge", ...requestBody }] };
    await route.fulfill({ json: { status: "ok", data: version.transitions[0] } });
  });

  await page.goto("/index.html#/modelado-procesos?version_id=palette-v1");
  await expect(page.locator(".pm-node-palette")).toBeVisible();
  await page.locator("[data-node-id='palette-source']").click();
  await expect(page.locator("[data-node-id='palette-source']")).toHaveClass(/is-pm-selected/);
  await page.locator(".pm-palette-item[data-pm-palette-type='operation']").click();
  await expect(page.locator("#pm-node-modal")).toBeVisible();
  await expect(page.locator("#pm-palette-code")).toHaveValue("OP-001");
  await page.locator("#pm-palette-name").fill("Operación añadida");
  await page.getByRole("button", { name: "Guardar elemento" }).click();
  await expect(page.locator(".pm-flow > .pm-flow-nodes [data-node-id='palette-new']").first()).toBeVisible();
  await expect(page.locator(".pm-edge[data-pm-edge='palette-edge']")).toHaveCount(1);
  expect(version.transitions[0]).toMatchObject({ source_node_id: "palette-source", target_node_id: "palette-new", transition_type: "sequence" });
  await expect(page.locator("[data-pm-action='edit-selected-node']")).toBeEnabled();
  await page.getByRole("button", { name: "Editar" }).click();
  await page.locator("#pm-palette-name").fill("Operación editada");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator("[data-node-id='palette-new']").first()).toContainText("Operación editada");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.locator("[data-node-id='palette-new']")).toHaveCount(0);
});

test("reserva espacio para varias operaciones paralelas sin solapar otras líneas", async ({ page, request }) => {
  const versionId = "346d8078-6991-4d91-adc1-eab93cbaf06a";
  const payload = await (await request.get(`/api/process-modeling/versions/${versionId}`)).json();
  const version = payload.data;
  const ha = version.nodes.find((node) => node.node_code === "HA");
  if (!ha) test.skip(true, "La versión real no contiene la operación HA.");
  const additions = [1, 2, 3].map((index) => ({ node_id: `playwright-ha-${index}`, node_code: `PW_HA_${index}`, node_type: "operation", name: `Salida paralela ${index}` }));
  const modified = {
    ...version,
    nodes: [...version.nodes, ...additions],
    transitions: [...version.transitions, ...additions.map((node) => ({ transition_id: `playwright-edge-${node.node_id}`, source_node_id: ha.node_id, target_node_id: node.node_id, transition_type: "sequence", label: null }))],
  };
  await page.route(`**/api/process-modeling/versions/${versionId}`, (route) => route.fulfill({ json: { status: "ok", data: modified } }));
  await page.goto(`/index.html#/modelado-procesos?version_id=${versionId}`);
  await page.locator(".pm-bpm").waitFor({ state: "visible" });
  const layout = await page.locator(".pm-bpm").evaluate((diagram) => {
    const cards = [...diagram.querySelectorAll(".pm-flow > .pm-flow-nodes > .pm-bpm-card")].map((card) => {
      const box = card.getBoundingClientRect();
      return { code: card.querySelector(".pm-card-title")?.textContent?.trim(), left: box.left, right: box.right, top: box.top, bottom: box.bottom, center: box.left + box.width / 2 };
    });
    const overlaps = [];
    for (let index = 0; index < cards.length; index += 1) for (let next = index + 1; next < cards.length; next += 1) {
      const left = cards[index]; const right = cards[next];
      if (left.left < right.right && right.left < left.right && left.top < right.bottom && right.top < left.bottom) overlaps.push([left.code, right.code]);
    }
    const byCode = Object.fromEntries(cards.map((card) => [card.code, card]));
    return { overlaps, mainAxisDelta: Math.abs(byCode.MEZCLADOR.center - byCode.HA.center), flowWidth: diagram.querySelector(".pm-flow")?.getBoundingClientRect().width };
  });
  expect(layout.overlaps).toEqual([]);
  expect(layout.mainAxisDelta).toBeLessThan(1);
  expect(layout.flowWidth).toBeGreaterThan(1000);
});

test("muestra y persiste los metadatos JSON de la operación seleccionada", async ({ page }) => {
  const versionId = "346d8078-6991-4d91-adc1-eab93cbaf06a";
  await page.goto(`/index.html#/modelado-procesos?version_id=${versionId}`);
  await page.locator(".pm-bpm").waitFor({ state: "visible" });

  const operation = page.locator(".pm-bpm-card-operation").filter({ hasText: "HA" }).first();
  await operation.click();
  const metadataPanel = page.locator("#pm-metadata-panel");
  await expect(metadataPanel).toHaveAttribute("aria-label", "Metadatos del elemento seleccionado");
  await expect(metadataPanel).toContainText("Resumen");

  await metadataPanel.getByRole("button", { name: "Editar", exact: true }).click();
  const metadataJson = page.locator("#pm-metadata-json");
  const originalMetadata = await metadataJson.inputValue();
  const saveResponse = page.waitForResponse((response) => response.url().includes("/metadata") && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "Guardar metadatos" }).click();
  expect((await saveResponse).status()).toBe(200);
  await expect(page.locator("#pm-message")).toHaveText("Metadatos guardados.");
  await expect(metadataJson).toHaveCount(0);
  expect(JSON.parse(originalMetadata)).toMatchObject({ schema_version: "1.0" });
});

test("muestra el contexto funcional enriquecido en modo lectura", async ({ page }) => {
  const version = {
    process: { process_id: "read-process", process_code: "READ", name: "Proceso lectura" },
    version: { version_id: "read-version", version_number: 1, status: "draft" },
    nodes: [{
      node_id: "read-node", node_code: "DOSIFICACION", node_type: "operation", name: "Dosificación",
      description: "Dosifica el producto químico en la bolsa.",
      metadata: { context_type: "node", family: "industrial_process_fixture", data: {
        objective: "Alcanzar el peso objetivo.", inputs: ["Bigbag"], outputs: ["Bolsa dosificada"],
        parameters: ["vmax", "K"], quality_controls: ["Lectura de producto"],
        arbitrary_nested: { thresholds: { min: 1, max: 5 }, modes: ["auto", "manual"] },
        arbitrary_list: [{ key: "value", values: [1, 2, 3] }],
        declarative_contract: "KPI bajo demanda", operation_machine_assignments: [{ machine_ref: "BA01" }],
      } },
    }],
    transitions: [],
  };
  await page.route("**/api/bootstrap", (route) => route.fulfill({ json: { app_name: "test" } }));
  await page.route("**/api/operational/catalog", (route) => route.fulfill({ json: { defaults: {} } }));
  await page.route("**/api/process-modeling/processes", (route) => route.fulfill({ json: { status: "ok", data: [{ ...version.process, versions: [version.version] }] } }));
  await page.route("**/api/process-modeling/versions/read-version", (route) => route.fulfill({ json: { status: "ok", data: version } }));
  await page.route("**/api/process-modeling/versions/read-version/context**", (route) => route.fulfill({ json: { status: "ok", data: { records: [{ record_type: "declaration", payload: { data: { declarative_contract: "KPI bajo demanda", context_arbitrary: { source: "JSONB", tags: ["traceable", "live"] } } } }] } } }));

  await page.goto("/index.html#/modelado-procesos?version_id=read-version");
  await page.locator("[data-node-id='read-node']").click();
  const panel = page.locator("#pm-metadata-panel");
  for (const text of ["Descripción funcional", "Dosifica el producto químico", "Objetivo", "Entradas", "Salidas", "Parámetros", "Controles", "Contratos y asignaciones", "BA01", "Clave: arbitrary_nested", "thresholds", "Clave: arbitrary_list", "Clave: context_arbitrary", "traceable"]) {
    await expect(panel).toContainText(text);
  }
  await expect(panel.locator("#pm-metadata-json")).toHaveCount(0);
});

test("carga un proceso TEST existente desde el catálogo real", async ({ page }, testInfo) => {
  const catalogResponse = page.waitForResponse((response) => response.url().endsWith("/api/process-modeling/processes") && response.request().method() === "GET");
  await page.goto("/index.html#/modelado-procesos");
  const catalog = await (await catalogResponse).json();
  const processes = catalog.data || [];
  const testProcess = processes.find((item) => /^(TEST_PM_UI_|TEST_PM_E2E_)/.test(item.process_code || ""));

  if (!processes.length) {
    await expect(page.locator("#pm-process-selector option").first()).toContainText("Selecciona un proceso");
    testInfo.annotations.push({ type: "empty-catalog", description: "El catálogo PostgreSQL está vacío; se verificó el estado vacío explícito." });
    return;
  }

  if (!testProcess) {
    testInfo.annotations.push({ type: "test-data-unavailable", description: "El catálogo tiene procesos, pero ninguno con prefijo TEST_PM_UI_ o TEST_PM_E2E_." });
    test.skip(true, "No hay un proceso TEST_PM_UI_/TEST_PM_E2E_ disponible en el catálogo real.");
  }

  await selectProcess(page, testProcess.process_id);
  await expect(page.locator(".pm-breadcrumbs")).toHaveCount(0);
  await expect(page.locator(".pm-editor-head")).toHaveCount(0);
  await expect(page.locator(".pm-actions")).toHaveCount(0);
  await expect(page.locator(".pm-node").first()).toBeVisible();
  await expect(page.locator(".pm-transitions")).toHaveCount(0);
});

test("renderiza las preparaciones en paralelo y centra el stock final", async ({ page }) => {
  await page.goto("/index.html#/modelado-procesos");
  await selectProcessByCode(page, "PROCESO_MEZCLAS_CAUCHO_NEUMATICOS");
  await expect(page.locator(".pm-bpm")).toBeVisible();

  await expect(page.locator(".pm-edge-label")).toHaveCount(0);
  const positions = await page.locator(".pm-flow > .pm-flow-nodes > .pm-node").evaluateAll((items) => Object.fromEntries(items.map((item) => [item.querySelector(".pm-card-title")?.textContent, {
    left: Number.parseFloat(item.style.left),
    top: Number.parseFloat(item.style.top),
  }])));
  const parallelCodes = ["PREP_CAUCHO", "PREP_QUIM", "PREP_CARGAS", "PREP_ACEITES", "PREP_AZUFRE"];
  expect(new Set(parallelCodes.map((code) => positions[code].top)).size).toBe(1);
  expect(positions.STOCK_MEZCLAS.top).toBeGreaterThan(positions.FAB_MEZCLA.top);
  expect(Math.abs(positions.STOCK_MEZCLAS.left - positions.FAB_MEZCLA.left)).toBeLessThan(1);
});

test("TEST_PM_UI_1784458754642 abre el subprocess inline desde la tarjeta real", async ({ page, request }, testInfo) => {
  const catalogResponse = page.waitForResponse((response) => response.url().endsWith("/api/process-modeling/processes") && response.request().method() === "GET");
  await page.goto("/index.html#/modelado-procesos");
  const catalog = await (await catalogResponse).json();
  const process = (catalog.data || []).find((item) => item.process_code === "TEST_PM_UI_1784458754642");

  if (!process) {
    testInfo.annotations.push({ type: "test-data-unavailable", description: "No existe TEST_PM_UI_1784458754642 en el catálogo PostgreSQL; no se alteraron datos." });
    test.skip(true, "El proceso fijo de verificación no está disponible en el catálogo real.");
  }

  await selectProcess(page, process.process_id);
  await expect(page.locator(".pm-bpm")).toBeVisible();
  const subprocessCard = page.locator("[data-pm-node-type='subprocess']").filter({ hasText: "Operación 1" }).first();
  await expect(subprocessCard).toBeVisible();
  const subprocessId = await subprocessCard.getAttribute("data-node-id");
  expect(subprocessId).toBeTruthy();

  const expansionResponse = page.waitForResponse((response) => response.url().includes(`/api/process-modeling/versions/`) && response.url().includes(`expand_node_id=${subprocessId}`) && response.request().method() === "GET");
  await subprocessCard.click({ position: { x: 16, y: 16 } });
  const expansion = await expansionResponse;
  expect(expansion.ok()).toBeTruthy();
  const expansionPayload = await expansion.json();
  expect(expansionPayload.data.subprocess_context).toBeTruthy();
  await expect(page.locator("[data-pm-inline-child]")).toBeVisible();
  await expect(page.locator(".pm-breadcrumbs")).toHaveCount(0);
  await expect(page.locator("[data-pm-inline-child] .pm-node").first()).toBeVisible();
  await expect(page.locator("[data-pm-inline-child] .pm-edge").first()).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Contraer" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`version_id=.*node_id=${subprocessId}`));

  const nestedOp11 = page.locator("[data-pm-inline-child] [data-pm-node-type='subprocess']").filter({ hasText: "OP1.1" }).first();
  await expect(nestedOp11).toBeVisible();
  const nestedOp11Id = await nestedOp11.getAttribute("data-node-id");
  expect(nestedOp11Id).toBeTruthy();
  const nestedExpansionResponse = page.waitForResponse((response) => response.url().includes(`expand_node_id=${nestedOp11Id}`) && response.request().method() === "GET");
  await nestedOp11.click({ position: { x: 16, y: 16 } });
  const nestedExpansion = await nestedExpansionResponse;
  expect(nestedExpansion.ok()).toBeTruthy();
  const nestedPayload = await nestedExpansion.json();
  expect(nestedPayload.data.subprocess_context).toBeTruthy();
  await expect(page.locator("[data-pm-inline-child] [data-pm-inline-child]")).toBeVisible();
  await expect(page.locator("[data-pm-inline-child] [data-pm-inline-child] .pm-node").first()).toBeVisible();

  for (const code of ["OP2", "OP3"]) {
    const card = page.locator(`[data-pm-node-type='subprocess']`).filter({ hasText: code }).first();
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: /Expandir subflujo/ })).toBeVisible();
  }

  const persistedParent = await request.get(`/api/process-modeling/versions/${expansionPayload.data.subprocess_context.parent_version_id}`);
  expect(persistedParent.ok()).toBeTruthy();
  const persistedPayload = await persistedParent.json();
  expect(persistedPayload.data.nodes.some((node) => node.node_id === subprocessId && node.node_type === "subprocess")).toBeTruthy();
  expect(persistedPayload.data.nodes.some((node) => node.subprocess_context)).toBeFalsy();
});

test("los formularios editoriales antiguos ya no se renderizan", async ({ page, request }, testInfo) => {
  test.skip(true, "La construcción del flujo se realiza desde la paleta; los formularios pm-actions fueron retirados del editor.");
  const code = `TEST_PM_E2E_UI_${Date.now()}`;
  const createdIds = [];
  try {
    await page.goto("/index.html#/modelado-procesos");
    await page.locator("#pm-process-code").fill(code);
    await page.locator("#pm-process-name").fill("Proceso UI completo");
    await page.locator("#pm-process-form button[type=submit]").click();
    await expect(page.locator("#pm-message")).toContainText("Ahora crea una versión draft");
    await selectProcessByCode(page, code);
    await page.getByRole("button", { name: "Crear versión draft" }).click();

    const nodes = [
      ["INPUT", "input", "Entrada"],
      ["OP1", "operation", "Operación 1"],
      ["OP2", "operation", "Operación 2"],
      ["OP3", "operation", "Operación 3"],
      ["OUTPUT", "output", "Salida"],
    ];
    for (const [nodeCode, nodeType, nodeName] of nodes) {
      await page.locator("#pm-node-code").fill(`${code}_${nodeCode}`);
      await page.locator("#pm-node-name").fill(nodeName);
      await page.locator("#pm-node-type").selectOption(nodeType);
      await page.locator("#pm-node-form button[type=submit]").click();
      await expect(page.locator(".pm-node")).toHaveCount(nodes.indexOf(nodes.find((item) => item[0] === nodeCode)) + 1);
    }

    const nodeIds = await page.locator(".pm-node").evaluateAll((items) => items.map((item) => item.dataset.nodeId));
    for (let index = 0; index < nodeIds.length - 1; index += 1) {
      await page.locator("#pm-transition-source").selectOption(nodeIds[index]);
      await page.locator("#pm-transition-target").selectOption(nodeIds[index + 1]);
      await page.locator("#pm-transition-form button[type=submit]").click();
      await expect(page.locator(".pm-transitions")).toHaveCount(0);
    }

    const processOption = page.locator("#pm-process-selector option").filter({ hasText: code }).first();
    const processId = await processOption.getAttribute("value");
    createdIds.push(processId);
    await page.reload();
    await selectProcessByCode(page, code);
    await expect(page.locator(".pm-bpm")).toBeVisible();
    await expect(page.locator(".pm-node")).toHaveCount(5);
    await expect(page.locator(".pm-bpm-card-input")).toHaveCount(1);
    await expect(page.locator(".pm-bpm-card-operation")).toHaveCount(3);
    await expect(page.locator(".pm-bpm-card-output")).toHaveCount(1);
    await expect(page.locator(".pm-edge")).toHaveCount(4);
    await expect(page.locator(".pm-transitions")).toHaveCount(0);
    const flowScroll = page.locator(".pm-flow-scroll");
    await expect(flowScroll).toHaveAttribute("aria-label", "Viewport desplazable del diagrama BPM");
    const scrollMetrics = await flowScroll.evaluate((element) => {
      const style = getComputedStyle(element);
      const before = { left: element.scrollLeft, top: element.scrollTop };
      if (element.scrollWidth > element.clientWidth) element.scrollLeft = Math.min(120, element.scrollWidth - element.clientWidth);
      if (element.scrollHeight > element.clientHeight) element.scrollTop = Math.min(120, element.scrollHeight - element.clientHeight);
      return {
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        before,
        after: { left: element.scrollLeft, top: element.scrollTop },
      };
    });
    expect(["auto", "scroll"]).toContain(scrollMetrics.overflowX);
    expect(["auto", "scroll"]).toContain(scrollMetrics.overflowY);
    expect(scrollMetrics.scrollWidth > scrollMetrics.clientWidth || scrollMetrics.scrollHeight > scrollMetrics.clientHeight).toBeTruthy();
    if (scrollMetrics.scrollWidth > scrollMetrics.clientWidth) expect(scrollMetrics.after.left).toBeGreaterThan(scrollMetrics.before.left);
    if (scrollMetrics.scrollHeight > scrollMetrics.clientHeight) expect(scrollMetrics.after.top).toBeGreaterThan(scrollMetrics.before.top);
    const versionId = await page.locator("#pm-transition-source").getAttribute("data-version-id").catch(() => null);
    const processResponse = await request.get(`/api/process-modeling/processes/${processId}`);
    expect(processResponse.ok()).toBeTruthy();
    const processPayload = await processResponse.json();
    const version = processPayload.data.versions.find((item) => item.status === "draft");
    expect(version).toBeTruthy();
    const versionResponse = await request.get(`/api/process-modeling/versions/${version.version_id}`);
    const versionPayload = await versionResponse.json();
    expect(versionPayload.data.nodes).toHaveLength(5);
    expect(versionPayload.data.transitions).toHaveLength(4);
    expect(versionId === null || typeof versionId === "string").toBeTruthy();
    fs.mkdirSync(testInfo.outputDir, { recursive: true });
    await page.screenshot({ path: path.join(testInfo.outputDir, "process-modeling-bpm.png"), fullPage: true });
    fs.writeFileSync(path.join(testInfo.outputDir, "ui-create-summary.json"), JSON.stringify({ process_id: processId, nodes: 5, transitions: 4 }, null, 2));
  } finally {
    for (const processId of createdIds) execFileSync("python3", ["scripts/cleanup_process_modeling_e2e.py", processId], { stdio: "inherit" });
  }
});

test("modelado de procesos muestra listado, breadcrumbs y grafo real", async ({ page, request }, testInfo) => {
  const consoleLines = [];
  const failedRequests = [];
  const errorResponses = [];
  page.on("console", (message) => consoleLines.push(`${message.type()}: ${message.text()}`));
  page.on("requestfailed", (requestEvent) => failedRequests.push(`${requestEvent.method()} ${requestEvent.url()} :: ${requestEvent.failure()?.errorText || "unknown"}`));
  page.on("response", (response) => {
    if (response.status() >= 400) errorResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });

  const process = await jsonRequest(request, "post", "/api/process-modeling/processes", { process_code: testCode, name: testName });
  createdProcessId = process.process_id;
  const version = await jsonRequest(request, "post", `/api/process-modeling/processes/${process.process_id}/versions`, { change_description: "E2E real" });
  const nodeData = [
    ["INPUT", "input", "Entrada"],
    ["OPERATION", "operation", "Operación"],
    ["OUTPUT", "output", "Salida"],
  ];
  const nodes = [];
  for (const [node_code, node_type, name] of nodeData) {
    nodes.push(await jsonRequest(request, "post", `/api/process-modeling/versions/${version.version_id}/nodes`, { node_code: `${testCode}_${node_code}`, node_type, name }));
  }
  await jsonRequest(request, "post", `/api/process-modeling/versions/${version.version_id}/transitions`, { source_node_id: nodes[0].node_id, target_node_id: nodes[1].node_id, transition_type: "sequence" });
  await jsonRequest(request, "post", `/api/process-modeling/versions/${version.version_id}/transitions`, { source_node_id: nodes[1].node_id, target_node_id: nodes[2].node_id, transition_type: "sequence" });

  await page.goto("/index.html#/modelado-procesos");
  await expect(page.getByRole("heading", { name: "Modelado de procesos" })).toBeVisible();
  await expect(page.locator("#pm-process-selector option").filter({ hasText: testName })).toHaveCount(1);
  await selectProcess(page, process.process_id);
  await expect(page.locator(".pm-breadcrumbs")).toHaveCount(0);
  await expect(page.locator(".pm-node")).toHaveCount(3);
  await expect(page.locator(".pm-transitions")).toHaveCount(0);

  const refreshed = await jsonRequest(request, "get", `/api/process-modeling/versions/${version.version_id}`);
  expect(refreshed.nodes).toHaveLength(3);
  expect(refreshed.transitions).toHaveLength(2);

  fs.mkdirSync(testInfo.outputDir, { recursive: true });
  fs.writeFileSync(path.join(testInfo.outputDir, "console.log"), `${consoleLines.join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(testInfo.outputDir, "request-failures.log"), `${failedRequests.join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(testInfo.outputDir, "response-errors.log"), `${errorResponses.join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(testInfo.outputDir, "summary.json"), JSON.stringify({ process_id: process.process_id, version_id: version.version_id, nodes: refreshed.nodes.length, transitions: refreshed.transitions.length, real_api: true }, null, 2), "utf8");
});

test("AMD-002 expande padre/hijo y restaura el hash tras recarga", async ({ page, request }) => {
  const created = [];
  const suffix = Date.now();
  try {
    const parent = await jsonRequest(request, "post", "/api/process-modeling/processes", { process_code: `TEST_PM_E2E_AMD002_PARENT_${suffix}`, name: "Proceso padre AMD-002" });
    const child = await jsonRequest(request, "post", "/api/process-modeling/processes", { process_code: `TEST_PM_E2E_AMD002_CHILD_${suffix}`, name: "Proceso hijo AMD-002" });
    created.push(parent.process_id, child.process_id);
    const parentVersion = await jsonRequest(request, "post", `/api/process-modeling/processes/${parent.process_id}/versions`, { change_description: "AMD-002" });
    const childVersion = await jsonRequest(request, "post", `/api/process-modeling/processes/${child.process_id}/versions`, { change_description: "AMD-002" });

    const childNodes = [];
    for (const data of [
      { node_code: `OP1_1_${suffix}`, node_type: "operation", name: "Operación 1.1" },
      { node_code: `OP1_2_${suffix}`, node_type: "operation", name: "Operación 1.2" },
      { node_code: `STOCK_${suffix}`, node_type: "stock", name: "Stock 24", properties: { stock: { capacity: 24, initial_quantity: 24, unit: "unidades" } } },
      { node_code: `DECISION_${suffix}`, node_type: "decision", name: "Decisión" },
      { node_code: `NORMAL_${suffix}`, node_type: "output", name: "Salida normal", output_role: "normal" },
      { node_code: `WASTE_${suffix}`, node_type: "output", name: "Salida waste", output_role: "waste" },
    ]) childNodes.push(await jsonRequest(request, "post", `/api/process-modeling/versions/${childVersion.version_id}/nodes`, data));
    for (let i = 0; i < 3; i += 1) await jsonRequest(request, "post", `/api/process-modeling/versions/${childVersion.version_id}/transitions`, { source_node_id: childNodes[i].node_id, target_node_id: childNodes[i + 1].node_id, transition_type: "sequence" });
    await jsonRequest(request, "post", `/api/process-modeling/versions/${childVersion.version_id}/transitions`, { source_node_id: childNodes[3].node_id, target_node_id: childNodes[4].node_id, transition_type: "branch", label: "Sí" });
    await jsonRequest(request, "post", `/api/process-modeling/versions/${childVersion.version_id}/transitions`, { source_node_id: childNodes[3].node_id, target_node_id: childNodes[5].node_id, transition_type: "branch", label: "No" });

    const subprocess = await jsonRequest(request, "post", `/api/process-modeling/versions/${parentVersion.version_id}/nodes`, { node_code: `SUB_${suffix}`, node_type: "subprocess", name: "Operación 1", child_process_id: child.process_id });
    const expandResponse = await request.get(`/api/process-modeling/versions/${parentVersion.version_id}?expand_node_id=${subprocess.node_id}`);
    const expandedPayload = await expandResponse.json();
    expect(expandResponse.ok(), JSON.stringify(expandedPayload)).toBeTruthy();
    expect(expandedPayload.data.subprocess_context.parent_version_id).toBe(parentVersion.version_id);
    expect(expandedPayload.data.nodes.some((node) => node.node_code === `STOCK_${suffix}` && node.properties.stock.capacity === 24)).toBeTruthy();

    await page.goto(`/index.html#/modelado-procesos?version_id=${parentVersion.version_id}`);
    await expect(page.locator(`[data-node-id="${subprocess.node_id}"]`)).toBeVisible();
    await expect(page.getByTestId("pm-expand-subprocess")).toHaveText("Expandir subflujo");
    await page.locator(`[data-node-id="${subprocess.node_id}"]`).getByText("Operación 1", { exact: true }).click();
    await expect(page.locator("[data-pm-inline-child]")).toBeVisible();
    await expect(page.locator("[data-pm-inline-child]")).toContainText("Stock 24");
    await expect(page.locator("[data-pm-inline-child]")).toContainText("Sí");
    await expect(page.locator("[data-pm-inline-child]")).toContainText("No");
    await expect(page).toHaveURL(new RegExp(`version_id=${parentVersion.version_id}.*node_id=${subprocess.node_id}`));
    await page.reload();
    await expect(page.locator("[data-pm-inline-child]")).toBeVisible();
    await page.getByRole("button", { name: "Contraer" }).click();
    await expect(page.locator("[data-pm-inline-child]")).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`version_id=${parentVersion.version_id}(?:$|&)`));
  } finally {
    for (const processId of created) {
      try { execFileSync("python3", ["scripts/cleanup_process_modeling_e2e.py", processId], { stdio: "inherit" }); } catch (_error) { /* Parent deletion may cascade to the child. */ }
    }
  }
});

test("fixture jerárquico permite expandir OP1.1, OP2 y OP3", async ({ page }) => {
  await page.goto("/index.html#/modelado-procesos");
  await selectProcessByCode(page, "TEST_PM_UI_1784458754642");
  await page.waitForTimeout(250);

  const parentCanvas = page.locator(".pm-flow > .pm-flow-nodes");
  for (const code of ["TEST_PM_UI_1784458754642_OP2", "TEST_PM_UI_1784458754642_OP3"]) {
    const card = parentCanvas.locator("[data-pm-node-type='subprocess']").filter({ hasText: code }).first();
    await expect(card.getByTestId("pm-expand-subprocess")).toBeVisible();
    await card.getByTestId("pm-expand-subprocess").click();
  }
  await expect(page.locator("[data-pm-inline-child]")).toHaveCount(2);

  const op1 = parentCanvas.locator("[data-pm-node-type='subprocess']").filter({ hasText: "Operación 1" }).first();
  await op1.getByText("Operación 1", { exact: true }).click();
  await expect(page.locator("[data-pm-inline-child]")).toHaveCount(3);
  const childCanvas = page.locator("[data-pm-inline-child]").first();
  const op11 = childCanvas.locator("[data-pm-node-type='subprocess']").filter({ hasText: "Operación 1.1" }).first();
  await expect(op11.getByTestId("pm-expand-subprocess")).toBeVisible();
  await op11.getByTestId("pm-expand-subprocess").click();
  await expect(page.locator("[data-pm-inline-child]")).toHaveCount(4);
  await expect(page.locator("[data-pm-inline-child]").last()).toContainText("Operación interna");
});

test("expande subprocess inline y conserva etiquetas semánticas", async ({ page }) => {
  const parent = { process_id: "parent-1", process_code: "PARENT", name: "Proceso padre", versions: [{ version_id: "parent-v1", version_number: 1, status: "draft" }] };
  const child = { process_id: "child-1", process_code: "CHILD", name: "Operación 1", versions: [{ version_id: "child-v1", version_number: 1, status: "draft" }] };
  const parentVersion = { process: parent, version: { version_id: "parent-v1", version_number: 1 }, breadcrumbs: [{ process_code: "PARENT", version_number: 1 }], nodes: [
    { node_id: "sub-1", node_code: "SUB", node_type: "subprocess", name: "Operación 1", child_process_id: "child-1" },
    { node_id: "orphan-op-1", node_code: "OP1_ORPHAN", node_type: "operation", name: "Operación sin subproceso" },
    { node_id: "stock-1", node_code: "STOCK", node_type: "stock", name: "Buffer", properties: { stock: { capacity: 24, initial_quantity: 24, unit: "u" } } },
    { node_id: "decision-1", node_code: "DEC", node_type: "decision", name: "¿Conforme?" },
    { node_id: "normal-1", node_code: "OK", node_type: "output", name: "Salida buena", output_role: "normal" },
    { node_id: "waste-1", node_code: "SCRAP", node_type: "output", name: "Desperdicio", output_role: "waste" },
  ], transitions: [
    { transition_id: "t-1", source_node_id: "decision-1", target_node_id: "normal-1", transition_type: "branch", label: "Sí" },
    { transition_id: "t-2", source_node_id: "decision-1", target_node_id: "waste-1", transition_type: "branch", label: "No" },
    { transition_id: "t-3", source_node_id: "decision-1", target_node_id: "normal-1", transition_type: "sequence" },
    { transition_id: "t-4", source_node_id: "normal-1", target_node_id: "waste-1", transition_type: "sequence" },
  ], validation: { valid: true, errors: [] } };
  const childVersion = { process: child, version: { version_id: "child-v1", version_number: 1 }, breadcrumbs: [{ process_code: "CHILD", version_number: 1 }], nodes: [{ node_id: "child-op", node_code: "OP1", node_type: "operation", name: "Operación hija" }], transitions: [], validation: { valid: true, errors: [] } };
  await page.route("**/api/bootstrap", (route) => route.fulfill({ json: { app_name: "test" } }));
  await page.route("**/api/operational/catalog", (route) => route.fulfill({ json: { defaults: {} } }));
  await page.route("**/api/process-modeling/processes", (route) => route.fulfill({ json: { status: "ok", data: [parent] } }));
  await page.route("**/api/process-modeling/processes/parent-1", (route) => route.fulfill({ json: { status: "ok", data: parent } }));
  await page.route("**/api/process-modeling/processes/child-1", (route) => route.fulfill({ json: { status: "ok", data: child } }));
  await page.route("**/api/process-modeling/versions/parent-v1?expand_node_id=sub-1", (route) => route.fulfill({ json: { status: "ok", data: { ...childVersion, breadcrumbs: [{ process_code: "PARENT", version_number: 1 }, { process_code: "CHILD", version_number: 1 }], subprocess_context: { breadcrumb_label: "Proceso padre > Operación 1" } } } }));
  await page.route("**/api/process-modeling/versions/parent-v1", (route) => route.fulfill({ json: { status: "ok", data: parentVersion } }));
  await page.route("**/api/process-modeling/versions/child-v1", (route) => route.fulfill({ json: { status: "ok", data: childVersion } }));
  await page.goto("/index.html#/modelado-procesos");
  await selectProcess(page, "parent-1");
  await expect(page.locator("[data-pm-node-type='operation']")).toContainText("Sin subproceso asociado");
  await expect(page.getByTestId("pm-expand-subprocess")).toHaveAttribute("aria-label", "Expandir subflujo de Operación 1");
  await expect(page.locator(".pm-bpm-card-stock")).toContainText("Capacidad 24");
  await expect(page.locator(".pm-bpm-card-output").first()).toContainText("Salida: normal");
  await expect(page.locator(".pm-bpm-card-output").nth(1)).toContainText("Salida: waste");
  await expect(page.locator(".pm-transitions")).toHaveCount(0);
  const decisionCard = page.locator(".pm-bpm-card-decision").first();
  await decisionCard.scrollIntoViewIfNeeded();
  await decisionCard.click({ position: { x: 95, y: 70 } });
  await expect(decisionCard).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Editar" })).toBeEnabled();
  await page.locator(".pm-palette-item[data-pm-palette-type='operation']").click();
  await expect(page.locator(".pm-palette-branch-fields")).toBeVisible();
  await expect(page.locator("#pm-palette-branch-label")).toHaveAttribute("required", "");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.locator(".pm-flow > .pm-edge-layer > .pm-edge")).toHaveCount(2);
  const decisionBranchLayout = await page.locator(".pm-flow").evaluate((flow) => {
    const outputs = [...flow.querySelectorAll(".pm-bpm-card-output")].map((node) => node.getBoundingClientRect());
    const labels = [...flow.querySelectorAll(".pm-edge-label text")].map((node) => node.getBoundingClientRect());
    const branchPaths = [...flow.querySelectorAll(".pm-edge")].map((node) => node.getAttribute("d")).map((path) => path.match(/-?\d+(?:\.\d+)?/g).map(Number));
    return { outputs, labels, branchPaths };
  });
  expect(decisionBranchLayout.outputs[0].top).toBe(decisionBranchLayout.outputs[1].top);
  expect(decisionBranchLayout.outputs[0].left).not.toBe(decisionBranchLayout.outputs[1].left);
  const decisionCenter = await page.locator(".pm-flow .pm-bpm-card-decision").evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.left + rect.width / 2;
  });
  const outputGroupCenter = (decisionBranchLayout.outputs[0].left + decisionBranchLayout.outputs[1].right) / 2;
  expect(outputGroupCenter).toBeCloseTo(decisionCenter, 0);
  for (const label of decisionBranchLayout.labels) {
    expect(label.bottom).toBeLessThanOrEqual(Math.min(...decisionBranchLayout.outputs.map((output) => output.top)) + 1);
  }
  for (const path of decisionBranchLayout.branchPaths) {
    expect(path[0]).toBe(path[2]);
    expect(path[3]).toBe(path[5]);
    expect(path[4]).toBe(path[6]);
    expect(path[7]).toBeGreaterThan(path[5]);
  }
  await page.locator("[data-pm-node-type='subprocess']").getByText("Operación 1", { exact: true }).click();
  await expect(page.locator("[data-pm-inline-child]")).toBeVisible();
  const expandedCard = page.locator("[data-pm-node-type='subprocess']").filter({ hasText: "Operación 1" }).first();
  await expect(expandedCard.getByTestId("pm-expand-subprocess")).toHaveCount(0);
  const contained = await expandedCard.evaluate((card) => {
    const cardRect = card.getBoundingClientRect();
    const descendants = [card.querySelector(".pm-card-kicker"), card.querySelector(".pm-subprocess-mini-flow")].map((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, right: rect.right, bottom: rect.bottom };
    });
    return { card: { top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom }, descendants };
  });
  for (const descendant of contained.descendants) {
    expect(descendant.top).toBeGreaterThanOrEqual(contained.card.top);
    expect(descendant.right).toBeLessThanOrEqual(contained.card.right + 1);
    expect(descendant.bottom).toBeLessThanOrEqual(contained.card.bottom + 1);
  }
  const layout = await page.locator(".pm-flow > .pm-flow-nodes > .pm-node").evaluateAll((cards) => cards.map((card) => {
    const rect = card.getBoundingClientRect();
    return { top: Math.round(rect.top), left: rect.left, right: rect.right };
  }).sort((left, right) => left.left - right.left));
  for (let leftIndex = 0; leftIndex < layout.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < layout.length; rightIndex += 1) {
      if (layout[leftIndex].top !== layout[rightIndex].top) continue;
      expect(layout[leftIndex].right).toBeLessThanOrEqual(layout[rightIndex].left + 1);
    }
  }
  await expect(page.locator(".pm-flow")).toHaveCount(1);
  await expect(page.locator("[data-pm-node-type='subprocess'] [data-pm-inline-child]")).toBeVisible();
  await expect(page.locator("[data-pm-inline-child]").locator("xpath=.."))
    .toHaveAttribute("data-pm-node-type", "subprocess");
  await expect(page.locator(".pm-breadcrumbs")).toHaveCount(0);
  await expect(page.locator("[data-pm-inline-child] .pm-node")).toContainText("OP1");
  await expect(page).toHaveURL(/version_id=parent-v1.*node_id=sub-1/);
  await page.reload();
  await expect(page.locator("[data-pm-inline-child] .pm-node")).toContainText("OP1");
  await page.getByRole("button", { name: "Contraer" }).click();
  await expect(page.locator("[data-pm-inline-child]")).toHaveCount(0);
});

test("AMD-003 renderiza inicial, layout full-width y conserva fullscreen al expandir/contraer", async ({ page }) => {
  const processes = [
    { process_id: "amd003-parent", process_code: "AMD003-A", name: "Proceso A", versions: [{ version_id: "amd003-v1", version_number: 1, status: "draft" }] },
    { process_id: "amd003-other", process_code: "AMD003-B", name: "Proceso B", versions: [{ version_id: "amd003-v2", version_number: 1, status: "draft" }] },
  ];
  const parentVersion = {
    process: processes[0],
    version: { version_id: "amd003-v1", version_number: 1 },
    breadcrumbs: [{ process_code: "AMD003-A", version_number: 1 }],
    nodes: [
      { node_id: "amd003-sub", node_code: "SUB-1", node_type: "subprocess", name: "Operación 1", child_process_id: "amd003-child" },
      { node_id: "amd003-out", node_code: "OUT-1", node_type: "output", name: "Salida", output_role: "normal" },
    ],
    transitions: [
      { transition_id: "amd003-t1", source_node_id: "amd003-sub", target_node_id: "amd003-out", transition_type: "sequence" },
    ],
    validation: { valid: true, errors: [] },
  };
  const childExpandedVersion = {
    process: { process_id: "amd003-child", process_code: "AMD003-CHILD", name: "Subproceso" },
    version: { version_id: "amd003-child-v1", version_number: 1 },
    breadcrumbs: [{ process_code: "AMD003-A", version_number: 1 }, { process_code: "AMD003-CHILD", version_number: 1 }],
    nodes: [
      { node_id: "amd003-child-node", node_code: "CH-1", node_type: "operation", name: "Detalle hijo" },
    ],
    transitions: [],
    validation: { valid: true, errors: [] },
    subprocess_context: { breadcrumb_label: "Proceso A > Operación 1" },
  };
  const otherVersion = {
    process: processes[1],
    version: { version_id: "amd003-v2", version_number: 1 },
    breadcrumbs: [{ process_code: "AMD003-B", version_number: 1 }],
    nodes: [{ node_id: "amd003-other-node", node_code: "INPUT", node_type: "input", name: "Entrada B" }],
    transitions: [],
    validation: { valid: true, errors: [] },
  };

  await page.addInitScript(() => Object.defineProperty(Document.prototype, "fullscreenEnabled", { configurable: true, get: () => false }));
  await page.route("**/api/bootstrap", (route) => route.fulfill({ json: { app_name: "test" } }));
  await page.route("**/api/operational/catalog", (route) => route.fulfill({ json: { defaults: {} } }));
  await page.route("**/api/process-modeling/processes", (route) => route.fulfill({ json: { status: "ok", data: processes } }));
  await page.route("**/api/process-modeling/processes/amd003-parent", (route) => route.fulfill({ json: { status: "ok", data: processes[0] } }));
  await page.route("**/api/process-modeling/processes/amd003-other", (route) => route.fulfill({ json: { status: "ok", data: processes[1] } }));
  await page.route("**/api/process-modeling/versions/amd003-v1?expand_node_id=amd003-sub", (route) => route.fulfill({ json: { status: "ok", data: childExpandedVersion } }));
  await page.route("**/api/process-modeling/versions/amd003-v1", (route) => route.fulfill({ json: { status: "ok", data: parentVersion } }));
  await page.route("**/api/process-modeling/versions/amd003-v2", (route) => route.fulfill({ json: { status: "ok", data: otherVersion } }));

  await page.goto("/index.html#/modelado-procesos?version_id=amd003-v1");

  await expect(page.locator(".pm-node-palette")).toBeVisible();
  const selector = page.locator("#pm-process-selector");
  await expect(selector).toHaveAccessibleName("Proceso seleccionado");
  await expect(selector).toHaveValue("amd003-parent");
  await expect(page.locator(".pm-breadcrumbs")).toHaveCount(0);
  await expect(page.locator(".pm-node").first()).toContainText("Operación 1");

  const layoutState = await page.evaluate(() => {
    const layout = document.querySelector(".pm-layout");
    const editor = document.querySelector(".pm-editor");
    const columns = layout ? getComputedStyle(layout).gridTemplateColumns : "";
    const editorRect = editor?.getBoundingClientRect();
    return {
      columns,
      editorWidth: editorRect?.width || 0,
      flowWidth: document.querySelector(".pm-bpm")?.getBoundingClientRect().width || 0,
      removedControls: [".pm-breadcrumbs", ".pm-editor-head", ".pm-actions", ".pm-transitions"].every((selector) => !document.querySelector(selector)),
    };
  });
  expect(layoutState.columns).not.toContain("280px");
  expect(layoutState.removedControls).toBeTruthy();
  expect(layoutState.flowWidth).toBeGreaterThan(0);
  expect(layoutState.flowWidth).toBeLessThanOrEqual(layoutState.editorWidth + 1);

  const scrollState = await page.locator(".pm-flow-scroll").evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    documentScrollable: document.documentElement.scrollHeight > window.innerHeight,
  }));
  expect(scrollState.overflowY).not.toBe("hidden");
  expect(scrollState.documentScrollable).toBeTruthy();

  const fullscreen = page.getByRole("button", { name: "Pantalla completa" });
  await fullscreen.focus();
  await fullscreen.click();
  await expect(page.getByRole("button", { name: "Salir de pantalla completa" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".pm-page")).toHaveClass(/is-pm-focus-mode/);

  await page.locator("[data-pm-node-type='subprocess']").filter({ hasText: "Operación 1" }).first().click({ position: { x: 16, y: 16 } });
  await expect(page.locator("[data-pm-inline-child]")).toBeVisible();
  await expect(page.locator(".pm-page")).toHaveClass(/is-pm-focus-mode/);
  await expect(page.getByRole("button", { name: "Salir de pantalla completa" })).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("button", { name: "Contraer" }).click();
  await expect(page.locator("[data-pm-inline-child]")).toHaveCount(0);
  await expect(page.locator(".pm-page")).toHaveClass(/is-pm-focus-mode/);
  await expect(page.getByRole("button", { name: "Salir de pantalla completa" })).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("button", { name: "Salir de pantalla completa" }).click();
  await expect(page.getByRole("button", { name: "Pantalla completa" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("[data-pm-action='toggle-fullscreen']")).toBeFocused();
  await expect(page.locator(".pm-page")).not.toHaveClass(/is-pm-focus-mode/);

  await selector.selectOption("amd003-other");
  await expect(page.locator(".pm-breadcrumbs")).toHaveCount(0);
  await expect(page.locator(".pm-node")).toContainText("Entrada B");
});

test("AMD-004 conserva scroll interno en normal y fullscreen al expandir", async ({ page }) => {
  const process = { process_id: "amd004-scroll", process_code: "AMD004-SCROLL", name: "Flujo desplazable", versions: [{ version_id: "amd004-v1", version_number: 1, status: "draft" }] };
  const nodes = [
    { node_id: "amd004-sub", node_code: "SUB", node_type: "subprocess", name: "Subflujo", child_process_id: "amd004-child" },
    ...Array.from({ length: 24 }, (_, index) => ({ node_id: `amd004-op-${index}`, node_code: `OP-${index}`, node_type: "operation", name: `Operación ${index}` })),
    ...Array.from({ length: 10 }, (_, index) => ({ node_id: `amd004-wide-${index}`, node_code: `WIDE-${index}`, node_type: "operation", name: `Ancho ${index}` })),
  ];
  const transitions = nodes.slice(0, 25).map((node, index) => index === 0 ? null : ({ transition_id: `amd004-t-${index}`, source_node_id: nodes[index - 1].node_id, target_node_id: node.node_id, transition_type: "sequence" })).filter(Boolean);
  const version = { process, version: { version_id: "amd004-v1", version_number: 1 }, breadcrumbs: [{ process_code: process.process_code, version_number: 1 }], nodes, transitions, validation: { valid: true, errors: [] } };
  const child = { process: { process_id: "amd004-child", process_code: "AMD004-CHILD", name: "Hijo" }, version: { version_id: "amd004-child-v1", version_number: 1 }, breadcrumbs: [{ process_code: process.process_code, version_number: 1 }, { process_code: "AMD004-CHILD", version_number: 1 }], nodes: [{ node_id: "amd004-child-node", node_code: "CHILD-OP", node_type: "operation", name: "Operación hija" }], transitions: [], subprocess_context: { breadcrumb_label: "Flujo desplazable > Subflujo" }, validation: { valid: true, errors: [] } };
  await page.addInitScript(() => Object.defineProperty(Document.prototype, "fullscreenEnabled", { configurable: true, get: () => false }));
  await page.route("**/api/bootstrap", (route) => route.fulfill({ json: { app_name: "test" } }));
  await page.route("**/api/operational/catalog", (route) => route.fulfill({ json: { defaults: {} } }));
  await page.route("**/api/process-modeling/processes", (route) => route.fulfill({ json: { status: "ok", data: [process] } }));
  await page.route("**/api/process-modeling/processes/amd004-scroll", (route) => route.fulfill({ json: { status: "ok", data: process } }));
  await page.route("**/api/process-modeling/versions/amd004-v1?expand_node_id=amd004-sub", (route) => route.fulfill({ json: { status: "ok", data: child } }));
  await page.route("**/api/process-modeling/versions/amd004-v1", (route) => route.fulfill({ json: { status: "ok", data: version } }));
  await page.goto("/index.html#/modelado-procesos?version_id=amd004-v1");
  await expect(page.locator(".pm-flow-scroll")).toBeVisible();

  const normalMetrics = await page.locator(".pm-flow-scroll").evaluate((element) => {
    const style = getComputedStyle(element);
    const before = { left: element.scrollLeft, top: element.scrollTop };
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.scrollTop = element.scrollHeight - element.clientHeight;
    return { overflowX: style.overflowX, overflowY: style.overflowY, height: element.clientHeight, widthOverflow: element.scrollWidth > element.clientWidth, heightOverflow: element.scrollHeight > element.clientHeight, before, after: { left: element.scrollLeft, top: element.scrollTop } };
  });
  expect(normalMetrics.overflowX).toBe("auto");
  expect(normalMetrics.overflowY).toBe("auto");
  expect(normalMetrics.height).toBeGreaterThanOrEqual(220);
  expect(normalMetrics.widthOverflow).toBeTruthy();
  expect(normalMetrics.heightOverflow).toBeTruthy();
  expect(normalMetrics.after.left).toBeGreaterThan(normalMetrics.before.left);
  expect(normalMetrics.after.top).toBeGreaterThan(normalMetrics.before.top);
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBeTruthy();
  const hashBeforeFullscreen = page.url();

  let apiRequestsDuringScroll = 0;
  const onRequest = (request) => { if (request.url().includes("/api/process-modeling/")) apiRequestsDuringScroll += 1; };
  page.on("request", onRequest);
  await page.locator(".pm-flow-scroll").evaluate((element) => { element.scrollLeft = Math.max(0, element.scrollWidth - element.clientWidth - 10); element.scrollTop = Math.max(0, element.scrollHeight - element.clientHeight - 10); });
  await page.waitForTimeout(50);
  page.off("request", onRequest);
  expect(apiRequestsDuringScroll).toBe(0);
  expect(page.url()).toBe(hashBeforeFullscreen);

  await page.getByRole("button", { name: "Pantalla completa" }).click();
  await expect(page.getByRole("button", { name: "Salir de pantalla completa" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".pm-page")).toHaveClass(/is-pm-focus-mode/);
  const fullscreenMetrics = await page.locator(".pm-flow-scroll").evaluate((element) => {
    const style = getComputedStyle(element);
    const before = { left: element.scrollLeft, top: element.scrollTop };
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.scrollTop = element.scrollHeight - element.clientHeight;
    return { overflowX: style.overflowX, overflowY: style.overflowY, before, after: { left: element.scrollLeft, top: element.scrollTop } };
  });
  expect(fullscreenMetrics.overflowX).toBe("auto");
  expect(fullscreenMetrics.overflowY).toBe("auto");
  // Fullscreen enlarges the viewport; the preserved position may already be
  // at the new maximum, so scrolling to the end must be monotonic, not larger.
  expect(fullscreenMetrics.after.left).toBeGreaterThanOrEqual(fullscreenMetrics.before.left);
  expect(fullscreenMetrics.after.top).toBeGreaterThanOrEqual(fullscreenMetrics.before.top);
  expect(page.url()).toBe(hashBeforeFullscreen);

  await page.locator("[data-pm-node-type='subprocess']").getByRole("button", { name: "Expandir subflujo" }).click();
  await expect(page.locator("[data-pm-inline-child]")).toBeVisible();
  await expect(page.locator(".pm-page")).toHaveClass(/is-pm-focus-mode/);
  await expect(page.getByRole("button", { name: "Salir de pantalla completa" })).toBeFocused();
  const contextAfterExpand = await page.locator(".pm-flow-scroll").evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.scrollTop = element.scrollHeight - element.clientHeight;
    return { left: element.scrollLeft, top: element.scrollTop };
  });
  expect(contextAfterExpand.left).toBeGreaterThan(0);
  expect(contextAfterExpand.top).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Contraer" }).click();
  await expect(page.locator("[data-pm-inline-child]")).toHaveCount(0);
  await expect(page.locator(".pm-page")).toHaveClass(/is-pm-focus-mode/);
  await expect(page.getByRole("button", { name: "Salir de pantalla completa" })).toBeFocused();
});
