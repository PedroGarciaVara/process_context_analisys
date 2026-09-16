import { test, expect } from "@playwright/test";

async function analysisIds(page) {
  return page.locator("[data-analysis-card]").evaluateAll((cards) => cards.map((card) => card.textContent.match(/AN-\d+/)?.[0]));
}

async function waitForFilterOptions(page, selector) {
  await page.waitForFunction((filterSelector) => document.querySelectorAll(`${filterSelector} option`).length > 1, selector);
}

function countCauseNodes(nodes) {
  return (nodes || []).reduce((count, node) => count + (node?.node_type === "CAUSE" ? 1 : 0) + countCauseNodes(node?.children), 0);
}

test.describe("filtros de análisis de causas en inicio", () => {
  test("seleccionar todo conserva todos los análisis existentes", async ({ page, request }) => {
    const response = await request.get("/api/rca-tree/analyses?limit=100");
    const analyses = (await response.json()).data;

    await page.goto("/#/inicio");
    await expect(page.locator("#analysis-filter-status")).toBeVisible();
    await expect(page.locator("[data-analysis-card]")).toHaveCount(analyses.length);
    await expect(page.locator("#active-investigations-count")).toHaveText(String(analyses.filter((item) => item.estado === "abierto").length));

    await page.locator("#analysis-filter-status").selectOption("");
    await page.locator("#analysis-filter-process").selectOption("");
    await page.locator("#analysis-filter-operation").selectOption("");
    await page.locator("#analysis-filter-contract").selectOption("");
    await page.locator("#analysis-filter-machine").selectOption("");
    await expect(page.locator("[data-analysis-card]")).toHaveCount(analyses.length);
    expect(await analysisIds(page)).toHaveLength(analyses.length);
  });

  test("seleccionar un proceso aplica un único criterio", async ({ page, request }) => {
    const analyses = (await (await request.get("/api/rca-tree/analyses?limit=100")).json()).data;
    await page.goto("/#/inicio");
    await waitForFilterOptions(page, "#analysis-filter-process");
    const processOptions = page.locator("#analysis-filter-process option");
    const processIds = await processOptions.evaluateAll((options) => options.map((option) => option.value).filter(Boolean).slice(0, 2));
    test.skip(!processIds.length, "La base de datos no tiene procesos seleccionables");

    await page.locator("#analysis-filter-process").selectOption(processIds[0]);
    expect(await page.locator("#analysis-filter-process").inputValue()).toBe(processIds[0]);
    const expected = analyses.filter((item) => String(item.proceso_id) === processIds[0]);
    await expect(page.locator("[data-analysis-card]")).toHaveCount(expected.length);
    await expect(page.locator("#active-investigations-count")).toHaveText(String(expected.filter((item) => item.estado === "abierto").length));

    if (processIds.length > 1) {
      await page.locator("#analysis-filter-process").selectOption(processIds[1]);
      expect(await page.locator("#analysis-filter-process").inputValue()).toBe(processIds[1]);
      const replacementExpected = analyses.filter((item) => String(item.proceso_id) === processIds[1]);
      await expect(page.locator("[data-analysis-card]")).toHaveCount(replacementExpected.length);
      await expect(page.locator("#active-investigations-count")).toHaveText(String(replacementExpected.filter((item) => item.estado === "abierto").length));
    }
  });

  test("seleccionar una operación aplica un único criterio", async ({ page, request }) => {
    const analyses = (await (await request.get("/api/rca-tree/analyses?limit=100")).json()).data;
    const catalog = (await (await request.get("/api/bpm/operational/catalog")).json()).data.data;
    const machines = catalog.maquinas || [];
    await page.goto("/#/inicio");
    await waitForFilterOptions(page, "#analysis-filter-operation");
    const operationOptions = page.locator("#analysis-filter-operation option");
    const operationKeys = await operationOptions.evaluateAll((options) => options.map((option) => option.value).filter(Boolean).slice(0, 2));
    test.skip(!operationKeys.length, "La base de datos no tiene operaciones seleccionables");

    await page.locator("#analysis-filter-operation").selectOption(operationKeys[0]);
    expect(await page.locator("#analysis-filter-operation").inputValue()).toBe(operationKeys[0]);
    const [operationId, processId] = operationKeys[0].split("|");
    const expected = analyses.filter((item) => {
      const machine = machines.find((candidate) => String(candidate.id) === String(item.maquina_id));
      return item.operation_id
        ? String(item.operation_id) === operationId
        : (machine?.operations || []).some((operation) => String(operation.operation_id) === operationId && String(operation.process_id) === processId);
    });
    await expect(page.locator("[data-analysis-card]")).toHaveCount(expected.length);
    await expect(page.locator("#active-investigations-count")).toHaveText(String(expected.filter((item) => item.estado === "abierto").length));
  });

  test("seleccionar un contrato filtra los análisis existentes", async ({ page, request }) => {
    const analyses = (await (await request.get("/api/rca-tree/analyses?limit=100")).json()).data;
    await page.goto("/#/inicio");
    await waitForFilterOptions(page, "#analysis-filter-contract");
    const contractOptions = page.locator("#analysis-filter-contract option");
    const contractIds = await contractOptions.evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    test.skip(!contractIds.length, "La base de datos no tiene contratos seleccionables");

    await page.locator("#analysis-filter-contract").selectOption(contractIds[0]);
    expect(await page.locator("#analysis-filter-contract").inputValue()).toBe(contractIds[0]);
    const expected = analyses.filter((item) => String(item.contrato_id) === contractIds[0]);
    await expect(page.locator("[data-analysis-card]")).toHaveCount(expected.length);
    await expect(page.locator("#active-investigations-count")).toHaveText(String(expected.filter((item) => item.estado === "abierto").length));
  });

  test("los contratos se restringen por proceso y operación seleccionados", async ({ page, request }) => {
    const catalog = (await (await request.get("/api/bpm/operational/catalog")).json()).data.data;
    const contracts = catalog.contratos || [];
    const machines = catalog.maquinas || [];
    await page.goto("/#/inicio");
    await waitForFilterOptions(page, "#analysis-filter-process");
    const processIds = await page.locator("#analysis-filter-process option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    const processId = processIds.find((candidate) => machines.some((machine) => (machine.operations || []).some((operation) => String(operation.operational_process_id ?? machine.processId) === String(candidate))));
    test.skip(!processId, "La base de datos no tiene un proceso con operaciones");

    const processContractIds = new Set(machines.flatMap((machine) => {
      const operations = (machine.operations || []).filter((operation) => String(operation.operational_process_id ?? machine.processId) === String(processId));
      return operations.length ? [...(machine.contractIds || []), ...operations.map((operation) => operation.contract_id)] : [];
    }).filter((id) => id !== null && id !== undefined).map(String));
    await page.locator("#analysis-filter-process").selectOption(processId);
    const visibleProcessContracts = await page.locator("#analysis-filter-contract option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    expect(visibleProcessContracts).toEqual(contracts.filter((contract) => processContractIds.has(String(contract.id))).map((contract) => String(contract.id)));

    const operationKeys = await page.locator("#analysis-filter-operation option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    test.skip(!operationKeys.length, "El proceso no tiene operaciones seleccionables");
    const [operationId, operationProcessId] = operationKeys[0].split("|");
    const operationContractIds = new Set(machines.flatMap((machine) => (machine.operations || [])
      .filter((operation) => String(operation.operation_id) === operationId && String(operation.process_id) === operationProcessId)
      .map((operation) => operation.contract_id))
      .filter((id) => id !== null && id !== undefined).map(String));
    await page.locator("#analysis-filter-operation").selectOption(operationKeys[0]);
    const visibleOperationContracts = await page.locator("#analysis-filter-contract option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    expect(visibleOperationContracts).toEqual(contracts.filter((contract) => operationContractIds.has(String(contract.id))).map((contract) => String(contract.id)));
  });

  test("el proceso seleccionado limita el listado de operaciones a su perímetro", async ({ page, request }) => {
    const catalog = (await (await request.get("/api/bpm/operational/catalog")).json()).data.data;
    const machines = catalog.maquinas || [];
    const processIdsWithOperations = new Set(machines.flatMap((machine) => (machine.operations || []).map((operation) => String(operation.operational_process_id ?? machine.processId))));

    await page.goto("/#/inicio");
    await waitForFilterOptions(page, "#analysis-filter-process");
    const processIds = await page.locator("#analysis-filter-process option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    const processId = processIds.find((id) => processIdsWithOperations.has(String(id)));
    test.skip(!processId, "La base de datos no tiene un proceso con operaciones en el perímetro");

    const expectedOperationKeys = [...new Set(machines.flatMap((machine) => (machine.operations || [])
      .filter((operation) => String(operation.operational_process_id ?? machine.processId) === String(processId))
      .map((operation) => `${operation.operation_id}|${operation.process_id}`)))].sort();
    await page.locator("#analysis-filter-process").selectOption(processId);
    const visibleOperationKeys = await page.locator("#analysis-filter-operation option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean).sort());
    expect(visibleOperationKeys).toEqual(expectedOperationKeys);
  });

  test("los KPI de profundidad y hipótesis muestran su cálculo o estado pendiente", async ({ page, request }) => {
    const catalog = (await (await request.get("/api/bpm/operational/catalog")).json()).data.data;
    const contracts = catalog.contratos || [];
    const trees = await Promise.all(contracts.map(async (contract) => {
      const response = await request.get(`/api/rca-tree/nodes?view=arbol&contract_id=${contract.id}`);
      return response.json();
    }));
    const expectedDeepContracts = trees.filter((tree) => countCauseNodes(tree.tree) > 5).length;

    await page.goto("/#/inicio");
    await expect(page.locator("#deep-contracts-count")).toHaveText(String(expectedDeepContracts));
    await expect(page.getByText("Hipótesis automáticas")).toBeVisible();
    await expect(page.getByText("pendiente implementar calculo automatico")).toBeVisible();
  });
});
