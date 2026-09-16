import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const PROCESS_ID = "f247eee0-cfa1-4ea5-b4e6-fa4598a061b5";
const ROOT_PROCESS_ID = "06757b45-a08d-4493-8012-db03325399c8";
const ROOT_NODE_ID = "0333973e-4030-4973-aabd-87f545ece4c6";
const INPUT_ID = "7c68aef0-53e6-44e8-8d7d-97c0f250aa07";
const SAMPLING_ID = "71c54d24-c24e-479d-bcbc-20f14b04a713";
const ACCEPTANCE_ID = "5f72a958-b871-43d6-a5b6-d0e2ec427d21";
const DOSING_ID = "9a8b4bed-6cf2-56a7-8457-b2d5ddf0bfff";
const OUTPUT_ID = "75191cec-35e5-451f-98f7-7ced3e08857a";

const PROCESS_DESCRIPTION = "Proceso industrial desde la recepción de camiones con cargas reforzantes (negro y sílice) hasta la entrega dosificada en la tolva del mezclador interno (MI). Incluye registro BSM/QMP, muestreo y laboratorio, autorización de descarga, almacenamiento segregado por NIP/NIF, reposición y limpieza de circuitos, y dosificación según receta. Siguiente fase: Fabricación de mezclas. Fuente: requerimientos_cliente/descripciones del proceso/test_dosificacion_cargas.";

const NODES = {
  registration: {
    type: "manual", name: "Registrar camión y lote en BSM y QMP",
    description: "Dar de alta cada camión en BSM para la gestión de stock y en QMP para registrar los resultados de laboratorio de la materia prima entrante.",
  },
  sampling: {
    type: "manual", name: "Tomar muestra manual del camión",
    description: "Un operador toma manualmente una muestra representativa de cada camión y la traslada al laboratorio antes de autorizar cualquier descarga.",
  },
  laboratory: {
    type: "inspection", name: "Medir muestra y registrar resultado en QMP",
    description: "El laboratorio mide la muestra, contrasta el resultado con las tolerancias establecidas y registra el resultado en QMP.",
    criterion: "Resultado QMP dentro de las tolerancias establecidas",
  },
  acceptance: {
    type: "decision", name: "¿Resultado dentro de tolerancias?",
    description: "Decisión de autorización de descarga basada en el resultado de laboratorio registrado en QMP.",
  },
  unloading: {
    type: "machine", name: "Autorizar y ejecutar descarga en puesto",
    description: "Con resultado conforme, autorizar la descarga del camión en un puesto y conducir el producto mediante tapices por el circuito independiente de negro o de sílice.",
    resource: "Puestos de descarga y tapices",
  },
  transfer: {
    type: "machine", name: "Transferir por circuito independiente",
    description: "Transportar el negro o la sílice desde el puesto de descarga hasta el silo general asignado, sin mezclar los circuitos de ambos materiales.",
    resource: "Circuitos independientes de negro y sílice",
  },
  generalStock: {
    type: "stock", name: "Silos generales de negro y sílice",
    description: "Almacenar en silos generales de 30 T: 24 silos de negro y 12 silos de sílice. Nunca mezclar NIP distintos; los NIF solo pueden combinarse según compatibilidad y reglas de blocaje.",
    capacity: 30, unit: "T",
  },
  request: {
    type: "verification", name: "Detectar nivel de pedido y emitir solicitud",
    description: "Cuando un silo de cabecera en consumo alcanza el nivel de pedido, emitir una solicitud indicando el NIP requerido y el silo de destino.",
    criterion: "Nivel de pedido alcanzado; NIP y destino informados",
  },
  blockingRules: {
    type: "verification", name: "Aplicar blocajes y proporción de NIF",
    description: "Validar compatibilidad y reglas de blocaje antes del envío; cuando aplique, combinar NIF en las proporciones definidas, normalmente 50/50 o 30/70, conservando el mismo NIP.",
    criterion: "Mismo NIP y NIF compatibles según reglas de blocaje",
  },
  replenish: {
    type: "machine", name: "Reponer silo de cabecera hasta nivel alto",
    description: "Enviar producto desde el silo general al silo de cabecera exclusivo de la línea y detener el transporte al alcanzar el nivel alto.",
    resource: "Instalación de transporte a silos de cabecera",
  },
  cleaning: {
    type: "verification", name: "Limpiar circuito en vacío durante 2 min",
    description: "Tras la reposición, mantener cada elemento del circuito funcionando en vacío durante 2 minutos y confirmar que no se detecta producto.",
    duration: 2,
    criterion: "2 minutos en vacío sin detección de producto",
  },
  lineStock: {
    type: "stock", name: "Silo de cabecera exclusivo de línea",
    description: "Almacenar en silo de cabecera de 3 T, exclusivo de una línea. Cada línea dispone de 8 silos SP; cada báscula de negro está conectada únicamente a 4 silos.",
    capacity: 3, unit: "T",
  },
  recipe: {
    type: "verification", name: "Preparar demanda MI según receta",
    description: "Recibir la demanda del MI, leer la receta del producto y determinar NIP, cantidades y asignación de hasta 3 NIP a las dos básculas de la línea.",
    criterion: "NIP y cantidades coinciden con la receta demandada por el MI",
  },
  weight: {
    type: "verification", name: "Estabilizar, verificar y corregir peso",
    description: "Esperar peso estable y verificarlo. Si no está conforme, corregir y volver a verificar dentro de esta operación controlada; el grafo no dibuja el retorno porque el modelo canónico prohíbe ciclos.",
    criterion: "Peso estable dentro de la tolerancia de receta",
  },
  discharge: {
    type: "machine", name: "Descargar producto a la tolva del MI",
    description: "Descargar la carga reforzante pesada desde la báscula hacia la tolva de introducción del mezclador interno de la línea.",
    resource: "Básculas de negro BNx1 y BNx2",
  },
  zero: {
    type: "verification", name: "Verificar cero final de báscula",
    description: "Confirmar el cero con la báscula vacía. Si queda producto retenido, repetir descarga y verificación dentro de este control; el retorno no se dibuja porque el modelo canónico prohíbe ciclos.",
    criterion: "Báscula vacía con cero confirmado y sin producto retenido",
  },
  blocked: {
    type: "manual", name: "Bloquear descarga y gestionar no conformidad",
    description: "Con resultado fuera de tolerancias, impedir la descarga, mantener el camión retenido y gestionar la no conformidad en BSM/QMP según el procedimiento aplicable.",
  },
  rejected: {
    type: "end", name: "Camión retenido sin descarga",
    description: "Salida alternativa: la materia prima no entra en los silos y queda retenida para resolución de la no conformidad.",
    outputRole: "waste",
  },
};

async function graph(request, processId = PROCESS_ID) {
  const response = await request.get(`/api/bpm/processes/${processId}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}

async function waitForSaved(page) {
  await expect(page.locator("#save-label")).toHaveText("Guardado en base de datos", { timeout: 12_000 });
}

async function selectNode(page, nodeId) {
  const node = page.locator(`[data-node-id="${nodeId}"]`);
  await expect(node).toBeVisible({ timeout: 12_000 });
  await node.click({ force: true });
  await expect(page.locator("#inspector-content")).toBeVisible();
}

async function editSelectedNode(page, desired) {
  let changed = false;
  if (desired.type) {
    const type = page.locator('[data-node-field="type"]');
    if (await type.inputValue() !== desired.type) {
      await type.selectOption(desired.type);
      changed = true;
    }
  }
  const fields = [
    ["name", desired.name], ["description", desired.description],
    ["resource", desired.resource], ["criterion", desired.criterion],
    ["capacity", desired.capacity], ["unit", desired.unit],
    ["duration", desired.duration], ["outputRole", desired.outputRole],
  ];
  for (const [field, value] of fields) {
    if (value === undefined) continue;
    const input = page.locator(`[data-node-field="${field}"]`);
    await expect(input).toBeVisible();
    if (await input.inputValue() !== String(value)) {
      if (await input.evaluate((element) => element.tagName === "SELECT")) await input.selectOption(String(value));
      else await input.fill(String(value));
      changed = true;
    }
  }
  if (changed) await waitForSaved(page);
}

async function ensureEdge(page, request, sourceId, targetId, label = null) {
  let current = await graph(request);
  let edge = current.transitions.find((item) => String(item.source_node_id) === String(sourceId) && String(item.target_node_id) === String(targetId));
  if (!edge) {
    await selectNode(page, sourceId);
    await page.locator(`[data-node-id="${sourceId}"] [data-connect-from="${sourceId}"]`).click({ force: true });
    await page.locator(`[data-node-id="${targetId}"]`).click({ force: true });
    await expect.poll(async () => {
      current = await graph(request);
      edge = current.transitions.find((item) => String(item.source_node_id) === String(sourceId) && String(item.target_node_id) === String(targetId));
      return Boolean(edge);
    }, { timeout: 12_000 }).toBe(true);
  }
  if (label !== null && edge.label !== label) {
    const target = current.nodes.find((item) => String(item.node_id) === String(targetId));
    await selectNode(page, sourceId);
    await page.locator('[data-inspector-tab="relations"]').click();
    await page.locator(".connection-item").filter({ hasText: target?.name || "" }).click();
    const labelInput = page.locator('[data-edge-field="label"]');
    await labelInput.fill(label);
    await waitForSaved(page);
  }
  return edge;
}

async function ensureNodeAfter(page, request, predecessorId, desired) {
  let current = await graph(request);
  let node = current.nodes.find((item) => item.name === desired.name);
  if (!node) {
    const before = new Set(current.nodes.map((item) => String(item.node_id)));
    await selectNode(page, predecessorId);
    await page.locator(`[data-add-type="${desired.type}"]`).click();
    await expect.poll(async () => (await graph(request)).nodes.length, { timeout: 12_000 }).toBe(before.size + 1);
    current = await graph(request);
    node = current.nodes.find((item) => !before.has(String(item.node_id)));
    expect(node).toBeTruthy();
  }
  await selectNode(page, node.node_id);
  await editSelectedNode(page, desired);
  await ensureEdge(page, request, predecessorId, node.node_id);
  return (await graph(request)).nodes.find((item) => item.name === desired.name);
}

async function ensureDecisionBranch(page, request, decisionId, label, desired) {
  let current = await graph(request);
  let node = current.nodes.find((item) => item.name === desired.name);
  if (!node) {
    const before = new Set(current.nodes.map((item) => String(item.node_id)));
    await selectNode(page, decisionId);
    await page.locator(`[data-add-decision-branch="${label}"]`).click();
    await expect.poll(async () => (await graph(request)).nodes.length, { timeout: 12_000 }).toBe(before.size + 1);
    current = await graph(request);
    node = current.nodes.find((item) => !before.has(String(item.node_id)));
    expect(node).toBeTruthy();
  }
  await selectNode(page, node.node_id);
  await editSelectedNode(page, desired);
  await ensureEdge(page, request, decisionId, node.node_id, label);
  return (await graph(request)).nodes.find((item) => item.name === desired.name);
}

async function deleteEdgeIfPresent(page, request, sourceId, targetId) {
  const current = await graph(request);
  const edge = current.transitions.find((item) => String(item.source_node_id) === String(sourceId) && String(item.target_node_id) === String(targetId));
  if (!edge) return;
  const target = current.nodes.find((item) => String(item.node_id) === String(targetId));
  await selectNode(page, sourceId);
  await page.locator('[data-inspector-tab="relations"]').click();
  await page.locator(".connection-item").filter({ hasText: target?.name || "" }).click();
  await expect(page.locator('[data-edge-field="label"]')).toBeVisible();
  await page.locator('[data-action="delete-selected"]').click();
  await expect.poll(async () => (await graph(request)).transitions.some((item) => String(item.transition_id) === String(edge.transition_id)), { timeout: 12_000 }).toBe(false);
  await expect(page.locator(`[data-node-id="${sourceId}"]`)).toBeVisible();
}

test("complete and validate Preparación de cargas reforzantes using only the real UI", async ({ page, request }, testInfo) => {
  test.setTimeout(240_000);
  const uiMutations = [];
  page.on("request", (entry) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(entry.method()) && entry.url().includes("/api/bpm/")) {
      uiMutations.push({ method: entry.method(), url: entry.url() });
    }
  });

  const initial = await graph(request);

  if (initial.description !== PROCESS_DESCRIPTION) {
    await page.goto(`/index.html#/procesos_detalle?bpm_process_id=${PROCESS_ID}`);
    await expect(page.locator("#process-page-description")).toBeVisible({ timeout: 20_000 });
    await page.locator("#process-page-description").fill(PROCESS_DESCRIPTION);
    await page.locator("#process-page-save").click();
    await expect(page.locator("#process-page-alert")).toContainText("Proceso BPM actualizado", { timeout: 12_000 });
  }

  await page.goto(`/bpm-studio.html?processId=${ROOT_PROCESS_ID}`);
  await expect(page.locator(`[data-node-id="${ROOT_NODE_ID}"]`)).toBeVisible({ timeout: 20_000 });
  await selectNode(page, ROOT_NODE_ID);
  await editSelectedNode(page, {
    name: "Preparación de cargas reforzantes",
    description: "Subproceso canónico desde la recepción y control de camiones hasta la entrega de cargas dosificadas en la tolva del MI; continúa en Fabricación de mezclas.",
  });

  await page.goto(`/bpm-studio.html?processId=${PROCESS_ID}`);
  await expect(page.locator(`[data-node-id="${INPUT_ID}"]`)).toBeVisible({ timeout: 20_000 });
  const initialLayoutSaved = page.waitForResponse((response) => response.url().endsWith(`/api/bpm/processes/${PROCESS_ID}/layout`) && response.request().method() === "PUT" && response.ok());
  await page.locator('[data-action="auto-layout"]').click();
  await initialLayoutSaved;
  await page.locator('[data-action="fit"]').click();

  // Repair the two stable canonical identities through the inspector if a prior interrupted
  // interaction left one of them with the other's visual type or text.
  await selectNode(page, SAMPLING_ID);
  await editSelectedNode(page, NODES.sampling);
  await selectNode(page, ACCEPTANCE_ID);
  await editSelectedNode(page, NODES.acceptance);

  await deleteEdgeIfPresent(page, request, INPUT_ID, DOSING_ID);
  await deleteEdgeIfPresent(page, request, DOSING_ID, OUTPUT_ID);

  await selectNode(page, INPUT_ID);
  await editSelectedNode(page, {
    name: "Camión de cargas reforzantes en recepción",
    description: "Entrada: camión con negro o sílice presentado en recepción, pendiente de alta, muestreo y autorización antes de descargar.",
  });
  await selectNode(page, DOSING_ID);
  await editSelectedNode(page, {
    name: "Dosificación de cargas reforzantes",
    description: "Dosificar según receta y tiempo de ciclo del MI: establecer cero y trabajar en gran caudal, regulación y velocidad mínima. Admitir hasta 3 NIP; dos NIP en una misma báscula requieren dos ajustes y dos capturas de peso estable. Tecnología de doble sinfín en líneas 1 y 2 salvo SP23/SP24; sinfín único en SP23/SP24 y línea 4.",
  });
  await selectNode(page, OUTPUT_ID);
  await editSelectedNode(page, {
    name: "Carga reforzante disponible en tolva del MI",
    description: "Salida normal: producto dosificado y descargado en la tolva de introducción del MI, disponible para la siguiente fase de Fabricación de mezclas.",
    outputRole: "normal",
  });

  const registration = await ensureNodeAfter(page, request, INPUT_ID, NODES.registration);
  const sampling = await ensureNodeAfter(page, request, registration.node_id, NODES.sampling);
  const laboratory = await ensureNodeAfter(page, request, sampling.node_id, NODES.laboratory);
  const acceptance = await ensureNodeAfter(page, request, laboratory.node_id, NODES.acceptance);

  const unloading = await ensureDecisionBranch(page, request, acceptance.node_id, "Sí", NODES.unloading);
  const transfer = await ensureNodeAfter(page, request, unloading.node_id, NODES.transfer);
  const generalStock = await ensureNodeAfter(page, request, transfer.node_id, NODES.generalStock);
  const requestNode = await ensureNodeAfter(page, request, generalStock.node_id, NODES.request);
  const rules = await ensureNodeAfter(page, request, requestNode.node_id, NODES.blockingRules);
  const replenish = await ensureNodeAfter(page, request, rules.node_id, NODES.replenish);
  const cleaning = await ensureNodeAfter(page, request, replenish.node_id, NODES.cleaning);
  const lineStock = await ensureNodeAfter(page, request, cleaning.node_id, NODES.lineStock);
  const recipe = await ensureNodeAfter(page, request, lineStock.node_id, NODES.recipe);
  await ensureEdge(page, request, recipe.node_id, DOSING_ID);

  const weight = await ensureNodeAfter(page, request, DOSING_ID, NODES.weight);
  const discharge = await ensureNodeAfter(page, request, weight.node_id, NODES.discharge);
  const zero = await ensureNodeAfter(page, request, discharge.node_id, NODES.zero);
  await ensureEdge(page, request, zero.node_id, OUTPUT_ID);

  const blocked = await ensureDecisionBranch(page, request, acceptance.node_id, "No", NODES.blocked);
  await ensureNodeAfter(page, request, blocked.node_id, NODES.rejected);

  const layoutSaved = page.waitForResponse((response) => response.url().endsWith(`/api/bpm/processes/${PROCESS_ID}/layout`) && response.request().method() === "PUT" && response.ok());
  await page.locator('[data-action="auto-layout"]').click();
  await layoutSaved;
  await page.locator('[data-action="fit"]').click();

  const completed = await graph(request);
  const branchLabels = completed.transitions
    .filter((edge) => String(edge.source_node_id) === String(acceptance.node_id))
    .map((edge) => edge.label).sort();
  expect(completed.nodes).toHaveLength(21);
  expect(completed.transitions).toHaveLength(20);
  expect(branchLabels).toEqual(["No", "Sí"]);
  expect(completed.nodes.find((node) => node.node_id === DOSING_ID)?.name).toBe("Dosificación de cargas reforzantes");
  expect(completed.parent_process_id).toBe(ROOT_PROCESS_ID);

  await page.screenshot({ path: testInfo.outputPath("preparacion-cargas-flujo-completo.png"), fullPage: true });
  const domainValidation = page.waitForResponse((response) => response.url().endsWith(`/api/bpm/processes/${PROCESS_ID}/validate`) && response.request().method() === "POST");
  await page.locator('[data-action="validate"]').click();
  const validationPayload = await (await domainValidation).json();
  expect(validationPayload.data).toEqual({ valid: true, errors: [] });
  await expect(page.locator("#validation-content")).toContainText("Modelo válido");
  await page.locator("#validation-dialog [data-action='close-dialog']").first().click();
  const decisionCard = page.locator(`[data-node-id="${acceptance.node_id}"]`);
  await decisionCard.scrollIntoViewIfNeeded();
  await decisionCard.click();
  await expect(page.locator('[data-add-decision-branch="Sí"]')).toBeDisabled();
  await expect(page.locator('[data-add-decision-branch="No"]')).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("preparacion-cargas-ramas-si-no.png"), fullPage: true });

  await page.goto(`/bpm-studio.html?processId=${ROOT_PROCESS_ID}`);
  const openChild = page.locator(`[data-open-subprocess="${ROOT_NODE_ID}"]`).first();
  await expect(openChild).toBeVisible({ timeout: 20_000 });
  await openChild.click();
  await expect(page.locator("#db-process-selector")).toHaveValue(PROCESS_ID);
  await expect(page.locator("#process-title")).toHaveValue("Preparación de cargas reforzantes");
  await page.screenshot({ path: testInfo.outputPath("preparacion-cargas-navegacion-hijo.png"), fullPage: true });
  await page.locator("#process-back").click();
  await expect(page.locator("#db-process-selector")).toHaveValue(ROOT_PROCESS_ID);
  await expect(page.locator("#process-title")).toHaveValue("Fabricación de mezclas de caucho para neumáticos");

  const structuralMutations = uiMutations.filter(({ url }) => !url.endsWith("/layout") && !url.endsWith("/validate"));
  const mutationSummary = {
      initial_nodes: initial.nodes.length,
      initial_transitions: initial.transitions.length,
      final_nodes: completed.nodes.length,
      final_transitions: completed.transitions.length,
      run_mode: structuralMutations.length > 0 ? "ui-mutation-run" : "idempotent-verification-rerun",
      ui_mutating_requests: uiMutations,
      structural_ui_mutating_requests: structuralMutations,
      first_successful_ui_mutation_run: ".playwright-artifacts/test-results/2026-09-09T20-54-44",
      loop_abstraction: "Peso NO OK y cero NO OK se encapsulan en operaciones de control porque validate_graph rechaza graph_cycle.",
  };
  const mutationSummaryPath = testInfo.outputPath("ui-mutation-summary.json");
  await writeFile(mutationSummaryPath, JSON.stringify(mutationSummary, null, 2), "utf8");
  await testInfo.attach("ui-mutation-summary", {
    path: mutationSummaryPath,
    contentType: "application/json",
  });
});
