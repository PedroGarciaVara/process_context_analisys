import { test, expect } from "@playwright/test";

test("operation business data is edited without JSON and preserves extensions", async ({ page, request }) => {
  const createdResponse = await request.post("/api/bpm/processes", { data: { name: `TEST_STRUCTURED_EDITOR_${Date.now()}`, description: "Fixture temporal del editor guiado" } });
  expect(createdResponse.ok()).toBeTruthy();
  const process = (await createdResponse.json()).data;
  let operation;
  try {
    const operationResponse = await request.post(`/api/bpm/processes/${process.process_id}/nodes`, { data: { node_type: "operation", name: "Dosificación guiada", description: "Operación temporal" } });
    operation = (await operationResponse.json()).data;
    await request.patch(`/api/bpm/nodes/${operation.node_id}/metadata`, { data: { metadata: {
      context_type: "node", context_id: operation.node_id, family: "e2e", schema_version: "1.0",
      data: { inputs: [{ name: "Receta", description: "Versión liberada", unit: "document", extension: { owner: "MES" } }], custom_data: { retained: true } },
      source: { system: "playwright" }, provenance: { quality: "test" }, vendor_extension: { revision: 7 },
    } } });

    await page.goto(`/#/operaciones_detalle?process_id=${process.process_id}&node_id=${operation.node_id}`);
    await expect(page.getByRole("heading", { level: 1, name: "Dosificación guiada" })).toBeVisible();
    await expect(page.getByText("Información de negocio", { exact: true })).toBeVisible();
    await expect(page.getByText("Metadatos JSON")).toHaveCount(0);
    await expect(page.getByText("Etapas JSON")).toHaveCount(0);

    const inputs = page.locator('[data-json-editor="operation.inputs"]');
    await inputs.locator('[data-json-row-field="description"]').first().fill("Versión aprobada por producción");
    await inputs.locator('[data-json-action="add"]').click();
    const rows = inputs.locator("[data-json-row]");
    await rows.last().locator('[data-json-row-field="title"]').fill("NIP de producto");
    await rows.last().locator('[data-json-row-field="description"]').fill("Referencia requerida por la receta");
    await rows.last().locator('[data-json-action="up"]').click();

    const stages = page.locator("[data-operation-stage-editor]");
    await stages.locator("[data-stage-add]").click();
    await stages.locator("[data-stage-name]").fill("Preparar báscula");
    await page.locator("#operation-detail-save").click();
    await expect(page.locator("#operation-detail-alert")).toContainText("Operación actualizada");

    const metadataResponse = await request.get(`/api/bpm/nodes/${operation.node_id}/metadata`);
    const metadata = (await metadataResponse.json()).data.metadata;
    expect(metadata.vendor_extension).toEqual({ revision: 7 });
    expect(metadata.data.custom_data).toEqual({ retained: true });
    expect(metadata.data.inputs[1].unit).toBe("document");
    expect(metadata.data.inputs[1].extension).toEqual({ owner: "MES" });
    expect(metadata.data.inputs[0]).toEqual({ name: "NIP de producto", description: "Referencia requerida por la receta" });
    const graph = (await (await request.get(`/api/bpm/processes/${process.process_id}`)).json()).data;
    expect(graph.nodes.find((node) => node.node_id === operation.node_id).properties.etapas.etapas[0].nombre).toBe("Preparar báscula");
  } finally {
    await request.delete(`/api/bpm/processes/${process.process_id}?cascade=true`);
  }
});

test("machine detail mounts the same guided editor", async ({ page }) => {
  await page.goto("/#/maquinas_detalle?machine_id=5");
  await expect(page.getByRole("heading", { level: 1, name: "BA01" })).toBeVisible();
  const parameters = page.locator('[data-json-editor="specific_parameters"]');
  await expect(parameters.locator("[data-json-guided]")).toBeVisible();
  await parameters.locator('[data-json-action="add"]').click();
  await expect(parameters.locator("[data-json-row]").last().locator('[data-json-row-field="title"]')).toBeFocused();
});
