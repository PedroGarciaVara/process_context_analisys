import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  readableTreeContractLabel,
  resolveTreeDisplayContext,
} from "../../uc_bib_solv/webapp/js/components/tree-data.js";

const treeRenderSource = readFileSync(
  new URL("../../uc_bib_solv/webapp/js/components/tree-render.js", import.meta.url),
  "utf8",
);
const treeViewSource = readFileSync(
  new URL("../../uc_bib_solv/webapp/js/views/arboles_v02.js", import.meta.url),
  "utf8",
);

test("el contexto del árbol usa el nombre del proceso y el objetivo del contrato", () => {
  const context = resolveTreeDisplayContext(
    { contract: { id: 12, nombre: "BPM:R12_ML_FIXTURE_V1:BU_APROV" } },
    {
      data: {
        procesos: [{ id: 7, name: "Aprovisionamiento de BU" }],
        contratos: [{
          id: 12,
          processId: 7,
          processName: "Aprovisionamiento de BU",
          name: "BPM:R12_ML_FIXTURE_V1:BU_APROV",
          objetivo: "Garantizar la disponibilidad de materiales",
        }],
      },
    },
  );

  assert.deepEqual(context, {
    processName: "Aprovisionamiento de BU",
    objective: "Garantizar la disponibilidad de materiales",
    contractLabel: "Aprovisionamiento de BU · Garantizar la disponibilidad de materiales",
  });
});

test("un nombre técnico no se convierte en texto visible del selector", () => {
  assert.equal(
    readableTreeContractLabel({ name: "BPM:R12_ML_FIXTURE_V1:BU_APROV", processName: "Aprovisionamiento de BU" }),
    "Aprovisionamiento de BU",
  );
});

test("el markup del árbol no concatena IDs en textos visibles y conserva el contexto legible", () => {
  assert.match(treeRenderSource, /readableTreeContractLabel\(item\)/);
  assert.doesNotMatch(treeRenderSource, /option\.textContent\s*=\s*`\$\{item\.id\}/);
  assert.doesNotMatch(treeRenderSource, /\[\"ID\",/);
  assert.doesNotMatch(treeRenderSource, /`#\$\{payload\.contract\?\.id/);
  assert.match(treeRenderSource, /displayContext\.processName/);
  assert.match(treeRenderSource, /displayContext\.objective/);
  assert.match(treeViewSource, /Objetivo del contrato/);
  assert.match(treeViewSource, /escapeHtml\(objective\)/);
});
