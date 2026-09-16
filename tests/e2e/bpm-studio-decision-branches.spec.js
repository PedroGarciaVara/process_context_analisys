import { test, expect } from "@playwright/test";

test("create Sí and No operation branches directly from a decision", async ({ page, request }, testInfo) => {
  const processResponse = await request.post("/api/bpm/processes", {
    data: { name: `E2E ramas decisión ${Date.now()}`, description: "Proceso temporal para reproducir la interacción del Studio" },
  });
  expect(processResponse.ok()).toBeTruthy();
  const process = (await processResponse.json()).data;

  try {
    const inputResponse = await request.post(`/api/bpm/processes/${process.process_id}/nodes`, {
      data: { node_type: "input", name: "Orden recibida" },
    });
    const decisionResponse = await request.post(`/api/bpm/processes/${process.process_id}/nodes`, {
      data: { node_type: "decision", name: "¿Material conforme?" },
    });
    const input = (await inputResponse.json()).data;
    const decision = (await decisionResponse.json()).data;
    await request.post(`/api/bpm/processes/${process.process_id}/transitions`, {
      data: {
        source_node_id: input.node_id,
        target_node_id: decision.node_id,
        transition_type: "sequence",
      },
    });

    await page.goto("/#/studio-procesos");
    const studio = page.frameLocator("iframe[title='Editor visual de procesos industriales']");
    await expect(studio.locator("#db-process-selector")).toBeVisible();
    await studio.locator("#db-process-selector").selectOption(process.process_id);
    await expect(studio.locator(".decision-node")).toContainText("¿Material conforme?");

    await studio.locator(".decision-node").click();
    const yesButton = studio.locator("[data-add-decision-branch='Sí']");
    const noButton = studio.locator("[data-add-decision-branch='No']");
    await expect(yesButton).toBeEnabled();
    await expect(noButton).toBeEnabled();
    await yesButton.click();
    await expect(studio.locator("#toast-region")).toContainText("guardado en la base de datos");
    await page.screenshot({ path: testInfo.outputPath("decision-first-operation.png"), fullPage: true });

    await expect(studio.locator("[data-add-decision-branch='Sí']")).toBeDisabled();
    await expect(studio.locator("[data-add-decision-branch='No']")).toBeEnabled();
    await studio.locator("[data-add-decision-branch='No']").click();
    await expect(studio.locator("#toast-region")).toContainText("guardado en la base de datos");
    await expect(studio.locator("[data-add-decision-branch='Sí']")).toBeDisabled();
    await expect(studio.locator("[data-add-decision-branch='No']")).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath("decision-yes-no-complete.png"), fullPage: true });

    const graph = await request.get(`/api/bpm/processes/${process.process_id}`);
    const stored = (await graph.json()).data;
    const operations = stored.nodes.filter((node) => node.node_type === "operation");
    const branches = stored.transitions.filter((edge) => edge.source_node_id === decision.node_id && edge.transition_type === "branch");
    expect(operations).toHaveLength(2);
    expect(branches).toHaveLength(2);
    expect(branches.map((edge) => edge.label).sort()).toEqual(["No", "Sí"]);
  } finally {
    await request.delete(`/api/bpm/processes/${process.process_id}?cascade=true`);
  }
});
