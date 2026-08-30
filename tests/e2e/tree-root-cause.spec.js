import { test, expect } from "@playwright/test";

test("el árbol HTTP conserva hipótesis como hijas de su causa tras crear un contrato", async ({ page }) => {
  test.setTimeout(60_000);
  const suffix = Date.now();
  let contractId;
  let causeId;
  let hypothesisId;
  try {
    const contractResponse = await page.request.post("/api/bpm/contracts", {
      data: {
        proceso_id: 1,
        nombre: `TEST_Contrato árbol ${suffix}`,
        kpi_description: `TEST_KPI ${suffix}`,
        kpi_args: "",
        kpi_function: "",
        objetivo: `TEST_Objetivo ${suffix}`,
      },
    });
    expect(contractResponse.status()).toBe(201);
    const contractBody = await contractResponse.json();
    const contract = contractBody.data?.data || contractBody.data || contractBody.contract;
    contractId = Number(contract.id);

    const causeResponse = await page.request.post("/api/rca-tree/causes", {
      data: { contrato_id: contractId, nombre: `TEST_Causa ${suffix}`, descripcion: "TEST" },
    });
    expect(causeResponse.status()).toBe(201);
    const causeBody = await causeResponse.json();
    const cause = causeBody.data?.cause || causeBody.data || causeBody.cause;
    causeId = Number(cause.id);

    const hypothesisResponse = await page.request.post(`/api/rca-tree/causes/${causeId}/hypotheses`, {
      data: { descripcion: `TEST_Hipótesis ${suffix}`, tipo: "aceptacion", criterio_validacion: "TEST" },
    });
    expect(hypothesisResponse.status()).toBe(201);
    const hypothesisBody = await hypothesisResponse.json();
    hypothesisId = Number((hypothesisBody.data?.hypothesis || hypothesisBody.data || hypothesisBody.hypothesis).id);

    const treeResponse = await page.request.get(`/api/rca-tree/nodes?view=arbol&contract_id=${contractId}`);
    expect(treeResponse.ok()).toBeTruthy();
    const payload = await treeResponse.json();
    const tree = payload.data || payload;
    const causeNode = (tree.tree || []).find((node) => Number(node.id) === causeId);
    expect(causeNode?.children?.some((node) => Number(node.id) === hypothesisId && node.node_type === "HYPOTHESIS")).toBeTruthy();
  } finally {
    if (hypothesisId) await page.request.delete(`/api/rca-tree/hypotheses/${hypothesisId}`);
    if (causeId) await page.request.delete(`/api/rca-tree/causes/${causeId}`);
    if (contractId) await page.request.delete(`/api/bpm/contracts/${contractId}`);
  }
});

test("permite seleccionar un contrato y crear la primera causa raiz", async ({ page }) => {
  await page.goto("/#/arboles_v02");
  const processSelect = page.locator("#arbol-v02-process-select");
  await expect(processSelect).toBeVisible();
  await processSelect.selectOption({ index: 1 });

  const objectiveSelect = page.locator("#arbol-v02-objective-select");
  await expect(objectiveSelect).toBeEnabled();
  if (await objectiveSelect.locator("option").count() > 1) {
    await objectiveSelect.selectOption({ index: 1 });
  }

  const rootButton = page.locator('[data-action="tree-add-root-v02"]');
  await expect(rootButton).toBeEnabled();
  await rootButton.click();
  await expect(page).toHaveURL(/#\/causa_detalle_v02\?contrato_id=\d+/);

  const causeName = `Causa raíz E2E ${Date.now()}`;
  await page.locator("#cd-cause-name").fill(causeName);
  const createResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/rca-tree/causes") && response.request().method() === "POST",
  );
  await page.locator("#cd-cause-save").click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const responseBody = await createResponse.json();
  const createdCause = responseBody.cause || responseBody.data?.cause;
  expect(Number(createdCause?.contrato_id)).toBeGreaterThan(0);
  expect(createdCause?.nombre).toBe(causeName);
  await expect(page.locator("#cd-cause-name")).toHaveValue(causeName);
  await expect(page).toHaveURL(/#\/causa_detalle_v02\?contrato_id=\d+&causa_id=\d+/);
  await page.request.delete(`/api/rca-tree/causes/${createdCause.id}`);
  await page.locator("#cd-cause-exit").click();
  await expect(page).toHaveURL(/#\/arboles_v02/);
});

test("al cambiar de proceso actualiza los objetivos del contrato relacionado", async ({ page }) => {
  await page.goto("/#/arboles_v02?contract_id=1");
  const processSelect = page.locator("#arbol-v02-process-select");
  const objectiveSelect = page.locator("#arbol-v02-objective-select");

  await expect(processSelect).toHaveValue("1");
  await processSelect.selectOption("2");

  await expect(processSelect).toHaveValue("2");
  await expect(objectiveSelect).toBeEnabled();
  await expect(objectiveSelect.locator("option")).toContainText([
    "Obtener una bolsa correctamente formada y cerrada para iniciar la dosificación.",
  ]);
  await expect(page).toHaveURL(/#\/arboles_v02\?contract_id=2$/);
});

test("precarga los datos al editar una causa existente", async ({ page }) => {
  const detailResponse = await page.request.get("/api/rca-tree/causes/detail?contrato_id=2&causa_id=45");
  expect(detailResponse.ok()).toBeTruthy();
  const detail = await detailResponse.json();
  const cause = detail.cause || detail.data?.cause;
  expect(cause?.id).toBe(45);

  await page.goto("/#/causa_detalle_v02?contrato_id=2&causa_id=45");
  await expect(page.locator("#cd-hypothesis-status")).toHaveCount(0);
  await expect(page.locator("#cd-cause-name")).toHaveValue(cause.nombre);
  await expect(page.locator("#cd-cause-type")).toHaveValue(cause.tipo);
  await expect(page.locator("#cd-cause-category")).toHaveValue(cause.categoria);
  await expect(page.locator("#cd-cause-description")).toHaveValue(cause.descripcion);
});

test("permite crear una hipotesis para la causa activa", async ({ page }) => {
  await page.goto("/#/causa_detalle_v02?contrato_id=2&causa_id=45");
  await expect(page.locator("#cd-cause-name")).toHaveValue("causa_2_01");

  const hypothesisDescription = `Hipotesis E2E ${Date.now()}`;
  await page.locator("#cd-hypothesis-description").fill(hypothesisDescription);
  await page.locator("#cd-hypothesis-criterion").fill("Criterio E2E");
  const createResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/rca-tree/causes/45/hypotheses") && response.request().method() === "POST",
  );
  await page.locator("#cd-hypothesis-save").click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const responseBody = await createResponse.json();
  const createdHypothesis = responseBody.hypothesis || responseBody.data?.hypothesis;
  expect(Number(createdHypothesis?.causa_id)).toBe(45);
  expect(createdHypothesis?.descripcion).toBe(hypothesisDescription);
  await page.request.delete(`/api/rca-tree/hypotheses/${createdHypothesis.id}`);
});
