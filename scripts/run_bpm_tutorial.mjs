import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:8050";
const ARTIFACT_DIR = path.resolve(process.argv[2] || ".playwright-artifacts/test-results/bpm-tutorial");
const startedAt = new Date().toISOString();
const startedMs = Date.now();
const processName = `Tutorial BPM ${startedAt.replace(/[:.]/g, "-")}`;
const processDescription = "Proceso de muestra para tutorial de modelado BPM";
const expectedMutations = [];
const mutations = [];
const consoleLines = [];
const requestFailures = [];
const responseErrors = [];
const unexpectedMutations = [];
const screenshots = [];
let processId = null;
let page;
let context;
let browser;
let status = "BLOCKED";
let blockReason = null;
let connectionMode = "not-attempted";
let videoPath = null;

await fs.mkdir(ARTIFACT_DIR, { recursive: true });

function now() { return new Date().toISOString(); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function noteExpected(action) { expectedMutations.push({ action, at: Date.now(), until: Date.now() + 7000 }); }
function mutationExpected() {
  const current = Date.now();
  return expectedMutations.some((entry) => entry.until >= current);
}
async function writeJson(name, value) { await fs.writeFile(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`); }
async function screenshot(name) {
  const target = path.join(ARTIFACT_DIR, name);
  await page.screenshot({ path: target, fullPage: true });
  screenshots.push(target);
}
async function visualClick(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Sin geometría visible para ${label}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  await sleep(700);
  noteExpected(label);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(1000);
}
async function frameClick(frame, selector, label) {
  const locator = frame.locator(selector);
  await visualClick(locator, label);
  return locator;
}
async function frameFill(frame, selector, value, label) {
  const locator = frame.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await sleep(600);
  await locator.fill(value);
  await sleep(800);
  consoleLines.push(`${now()} [tutorial] fill ${label}`);
}

try {
  browser = await chromium.launch({ headless: true, chromiumSandbox: false });
  context = await browser.newContext({
    recordVideo: { dir: ARTIFACT_DIR, size: { width: 1440, height: 900 } },
    viewport: { width: 1440, height: 900 },
  });
  page = await context.newPage();
  page.on("console", (message) => consoleLines.push(`${now()} [${message.type()}] ${message.text()}`));
  page.on("pageerror", (error) => consoleLines.push(`${now()} [pageerror] ${error.stack || error.message}`));
  page.on("requestfailed", (request) => requestFailures.push({ timestamp: now(), method: request.method(), url: request.url(), failure: request.failure()?.errorText || "unknown" }));
  page.on("response", async (response) => {
    const request = response.request();
    const record = { timestamp: now(), method: request.method(), url: response.url(), status: response.status(), postData: request.postData() || null, expectedFromUiClick: mutationExpected() };
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      mutations.push(record);
      if (!record.expectedFromUiClick) unexpectedMutations.push(record);
    }
    if (response.status() >= 400) responseErrors.push(record);
  });

  await page.goto(`${BASE_URL}/index.html#/inicio`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main");
  await sleep(1200);
  await screenshot("01-inicio.png");

  await visualClick(page.locator('[data-route="procesos"]').first(), "navegar a Procesos");
  await page.waitForURL(/#\/procesos$/);
  await page.waitForSelector('[data-action="process-create"]');
  await screenshot("02-procesos.png");
  await visualClick(page.locator('[data-action="process-create"]'), "abrir nuevo proceso");
  await page.waitForURL(/#\/studio-procesos\?new=1/);
  const studio = page.frameLocator('iframe[title="Editor visual de procesos industriales"]');
  await studio.locator("#process-create-dialog").waitFor({ state: "visible" });
  await frameFill(studio, "#new-process-name", processName, "nombre del proceso");
  await frameFill(studio, "#new-process-description", processDescription, "descripción del proceso");
  const createResponse = page.waitForResponse((response) => response.url().endsWith("/api/bpm/processes") && response.request().method() === "POST");
  await frameClick(studio, '#process-create-form [type="submit"]', "crear proceso BPM");
  const createdProcessResponse = await createResponse;
  if (createdProcessResponse.status() === 409) {
    consoleLines.push(`${now()} [tutorial] El proceso ya existía; se continúa sobre el registro creado por el intento UI anterior`);
    await frameClick(studio, '#process-create-dialog .dialog-head [data-action="close-dialog"]', "cerrar diálogo de proceso duplicado");
    const existingOption = studio.locator('#db-process-selector option').filter({ hasText: processName }).first();
    await existingOption.waitFor({ state: "attached" });
    await studio.locator("#db-process-selector").selectOption({ label: processName });
    await sleep(1200);
  } else {
    await studio.locator("#process-create-dialog").waitFor({ state: "hidden" });
  }
  await studio.locator("#db-process-selector").waitFor({ state: "visible" });
  processId = await studio.locator("#db-process-selector").inputValue();
  if (!processId) throw new Error("La UI no devolvió el ID del proceso creado");
  await screenshot("03-proceso-creado.png");

  async function addNode(type, name, label) {
    await frameClick(studio, `[data-add-type="${type}"]`, label);
    await studio.locator(`[data-node-id]`).last().waitFor({ state: "visible" });
    await frameFill(studio, '[data-node-field="name"]', name, `nombre ${name}`);
    await sleep(900);
  }
  const existingNames = await studio.locator("[data-node-id]").allTextContents();
  if (!existingNames.some((text) => text.includes("Entrada de muestra"))) await addNode("start", "Entrada de muestra", "añadir nodo input");
  if (!existingNames.some((text) => text.includes("¿Resultado conforme?"))) await addNode("decision", "¿Resultado conforme?", "añadir nodo decision");
  const decisionByName = studio.locator('.decision-node').filter({ hasText: "¿Resultado conforme?" });
  await visualClick(decisionByName, "seleccionar decisión");
  async function addDecisionOutput(label, name) {
    const beforeCount = await studio.locator("[data-node-id]").count();
    await frameClick(studio, `[data-add-decision-branch="${label}"]`, `añadir rama ${label} visible`);
    await studio.locator("[data-node-id]").nth(beforeCount).waitFor({ state: "visible" });
    const defaultName = label === "Sí" ? "Continuar proceso" : "Gestionar no conformidad";
    const branchNode = studio.locator("[data-node-id]").filter({ hasText: defaultName }).last();
    await branchNode.waitFor({ state: "visible" });
    await visualClick(branchNode, `seleccionar salida de rama ${label}`);
    await frameFill(studio, '[data-node-field="name"]', name, `nombre ${name}`);
    const typeField = studio.locator('[data-node-field="type"]');
    await typeField.selectOption("end");
    await sleep(1400);
  }
  await addDecisionOutput("Sí", "Salida conforme");
  await visualClick(decisionByName, "volver a seleccionar decisión para rama No");
  await addDecisionOutput("No", "Salida no conforme");
  await screenshot("04-cuatro-nodos.png");

  const nodesBefore = await studio.locator("[data-node-id]").evaluateAll((nodes) => nodes.map((node) => ({ id: node.dataset.nodeId, text: node.innerText, aria: node.getAttribute("aria-label"), className: node.className })));
  const named = {};
  for (const expected of ["Entrada de muestra", "¿Resultado conforme?", "Salida conforme", "Salida no conforme"]) {
    const match = nodesBefore.find((node) => node.text.includes(expected) || node.aria?.includes(expected));
    if (match) named[expected] = match.id;
  }
  if (Object.keys(named).length !== 4) throw new Error(`No se localizaron los cuatro nodos: ${JSON.stringify(nodesBefore)}`);

  connectionMode = "visual-click-tool";
  async function connect(sourceName, targetName) {
    const source = named[sourceName];
    const target = named[targetName];
    await frameClick(studio, `[data-connect-from="${source}"]`, `iniciar conexión ${sourceName}`);
    await frameClick(studio, `[data-node-id="${target}"]`, `completar conexión ${targetName}`);
    await sleep(1200);
  }
  await connect("Entrada de muestra", "¿Resultado conforme?");
  await connect("¿Resultado conforme?", "Salida conforme");
  await connect("¿Resultado conforme?", "Salida no conforme");
  await screenshot("05-conexiones.png");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('iframe[title="Editor visual de procesos industriales"]');
  const reloaded = page.frameLocator('iframe[title="Editor visual de procesos industriales"]');
  await reloaded.locator("#db-process-selector").waitFor({ state: "visible" });
  await reloaded.locator(`[data-node-id]`).first().waitFor({ state: "visible" });
  const reloadNodes = await reloaded.locator("[data-node-id]").evaluateAll((nodes) => nodes.map((node) => ({ id: node.dataset.nodeId, text: node.innerText, aria: node.getAttribute("aria-label") })));
  const reloadText = reloadNodes.map((node) => `${node.text} ${node.aria || ""}`).join(" ");
  const graphResponse = await page.request.get(`${BASE_URL}/api/bpm/processes/${encodeURIComponent(processId)}`);
  const graphPayload = await graphResponse.json();
  const graph = graphPayload.data || graphPayload;
  const graphNodes = graph.nodes || [];
  const graphTransitions = graph.diagram_transitions || graph.transitions || [];
  const byName = Object.fromEntries(graphNodes.map((node) => [node.name, node.node_id]));
  const expectedConnectionTuples = [
    [byName["Entrada de muestra"], byName["¿Resultado conforme?"], "sequence"],
    [byName["¿Resultado conforme?"], byName["Salida conforme"], "branch"],
    [byName["¿Resultado conforme?"], byName["Salida no conforme"], "branch"],
  ];
  const observedConnections = graphTransitions.map((edge) => ({ source: edge.source_node_id, target: edge.target_node_id, type: edge.transition_type, label: edge.label || null }));
  const connectionProof = expectedConnectionTuples.map(([source, target, type]) => ({ source, target, type, present: observedConnections.some((edge) => edge.source === source && edge.target === target && edge.type === type) }));
  const reloadProof = {
    timestamp: now(), url: page.url(), processId,
    selectorValue: await reloaded.locator("#db-process-selector").inputValue(),
    processTitle: await reloaded.locator("#process-title").inputValue(),
    nodeCount: reloadNodes.length,
    requiredNodes: Object.fromEntries(["Entrada de muestra", "¿Resultado conforme?", "Salida conforme", "Salida no conforme"].map((name) => [name, reloadText.includes(name)])),
    nodes: reloadNodes,
    connections: connectionProof,
    observedConnections,
  };
  await writeJson("reload-proof.json", reloadProof);
  await screenshot("06-reload-proof.png");
  if (reloadProof.selectorValue !== processId || reloadProof.nodeCount < 4 || Object.values(reloadProof.requiredNodes).some((value) => !value)) {
    throw new Error(`La prueba tras recarga no confirmó proceso y cuatro nodos: ${JSON.stringify(reloadProof)}`);
  }
  if (connectionProof.some((connection) => !connection.present)) {
    throw new Error(`Limitación UI/backend: la conexión visual no quedó persistida tras recarga: ${JSON.stringify(connectionProof)}`);
  }
  status = "PASS";
} catch (error) {
  blockReason = { message: error.message, stack: error.stack };
  try { if (page) await screenshot("blocked-state.png"); } catch {}
} finally {
  if (page) {
    try { videoPath = await page.video()?.path(); } catch {}
  }
  if (context) await context.close();
  if (browser) await browser.close();
  const endedAt = new Date().toISOString();
  const summary = {
    status, startedAt, endedAt, durationMs: Date.now() - startedMs,
    baseUrl: BASE_URL, process: { id: processId, name: processName, description: processDescription },
    nodes: [
      { name: "Entrada de muestra", type: "input" },
      { name: "¿Resultado conforme?", type: "decision" },
      { name: "Salida conforme", type: "output" },
      { name: "Salida no conforme", type: "output" },
    ],
    connections: { mode: connectionMode, expected: ["Entrada de muestra → ¿Resultado conforme?", "¿Resultado conforme? → Salida conforme", "¿Resultado conforme? → Salida no conforme"] },
    mutationCount: mutations.length, unexpectedMutationCount: unexpectedMutations.length,
    video: videoPath, screenshots, blockReason,
    artifacts: ["summary.json", "summary.md", "mutation-requests.json", "console.log", "request-failures.log", "response-errors.log", "reload-proof.json"].map((name) => path.join(ARTIFACT_DIR, name)),
  };
  await writeJson("summary.json", summary);
  await writeJson("mutation-requests.json", { mutations, unexpectedMutations });
  await writeJson("reload-proof.json", (await fs.readFile(path.join(ARTIFACT_DIR, "reload-proof.json"), "utf8").catch(() => "null")) ? JSON.parse(await fs.readFile(path.join(ARTIFACT_DIR, "reload-proof.json"), "utf8").catch(() => "null")) : { status: "not-reached" });
  await fs.writeFile(path.join(ARTIFACT_DIR, "console.log"), `${consoleLines.join("\n")}\n`);
  await fs.writeFile(path.join(ARTIFACT_DIR, "request-failures.log"), `${requestFailures.map((item) => JSON.stringify(item)).join("\n")}\n`);
  await fs.writeFile(path.join(ARTIFACT_DIR, "response-errors.log"), `${responseErrors.map((item) => JSON.stringify(item)).join("\n")}\n`);
  const markdown = `# BPM tutorial\n\n- Status: ${status}\n- Process: ${processName}\n- Process ID: ${processId || "not created"}\n- Connections: ${connectionMode}\n- Duration: ${summary.durationMs} ms\n- Video: ${videoPath || "not available"}\n- Unexpected mutations: ${unexpectedMutations.length}\n- Block: ${blockReason?.message || "none"}\n\nArtifacts are absolute paths in summary.json.\n`;
  await fs.writeFile(path.join(ARTIFACT_DIR, "summary.md"), markdown);
  console.log(JSON.stringify({ ...summary, artifactDir: ARTIFACT_DIR }, null, 2));
}
