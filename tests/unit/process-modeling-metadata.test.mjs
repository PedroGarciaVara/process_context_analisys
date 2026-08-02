import test from "node:test";
import assert from "node:assert/strict";
import { buildMetadataSections } from "../../uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js";

test("projects node description and JSONB envelope fields into read-only sections", () => {
  const sections = Object.fromEntries(buildMetadataSections({
    description: "Descripción funcional",
    metadata: { data: { objective: "Objetivo", inputs: ["Entrada"], quality_controls: ["Control"], operation_machine_assignments: [{ machine_ref: "BA01" }] } },
  }));
  assert.equal(sections["Descripción funcional"], "Descripción funcional");
  assert.equal(sections["Objetivo"], "Objetivo");
  assert.deepEqual(sections["Entradas"], ["Entrada"]);
  assert.deepEqual(sections["Controles"], ["Control"]);
  assert.deepEqual(sections["Contratos y asignaciones"], [{ machine_ref: "BA01" }]);
});

test("uses existing context records to enrich contracts", () => {
  const sections = Object.fromEntries(buildMetadataSections(
    { metadata: { data: {} } },
    [{ record_type: "declaration", payload: { data: { declarative_contract: "Contrato vigente" } } }],
  ));
  assert.equal(sections["Contratos y asignaciones"], "Contrato vigente");
});

test("projects contracts and assignments together when both are present", () => {
  const sections = Object.fromEntries(buildMetadataSections({
    metadata: { data: {
      declarative_contract: "KPI bajo demanda",
      operation_machine_assignments: [{ machine_ref: "BA01" }],
    } },
  }));
  assert.deepEqual(sections["Contratos y asignaciones"], ["KPI bajo demanda", { machine_ref: "BA01" }]);
});

test("preserves arbitrary nested metadata and context JSONB fields", () => {
  const sections = buildMetadataSections({
    description: { operator_note: "Usar lote vigente" },
    metadata: {
      data: {
        objective: "Objetivo",
        calibration: { limits: { min: 1, max: 9 }, units: ["kg", "g"] },
        checkpoints: [{ code: "CP-1", rules: ["visual", "weight"] }],
      },
      provenance: { source: "planner" },
    },
  }, [{
    record_type: "evidence",
    payload: { data: { sensor_snapshot: { values: [1, 2], status: "ok" } } },
  }]);
  const byLabel = Object.fromEntries(sections);
  assert.deepEqual(byLabel["Clave: calibration"], { limits: { min: 1, max: 9 }, units: ["kg", "g"] });
  assert.deepEqual(byLabel["Clave: checkpoints"], [{ code: "CP-1", rules: ["visual", "weight"] }]);
  assert.deepEqual(byLabel["Clave: sensor_snapshot"], { values: [1, 2], status: "ok" });
  assert.deepEqual(byLabel["Clave: provenance"], { source: "planner" });
  assert.equal(sections.filter(([label]) => label === "Objetivo").length, 1);
});

test("does not duplicate known aliases when they carry the same datum", () => {
  const sections = buildMetadataSections({
    metadata: { data: { objective: "Alcanzar peso", purpose: "Alcanzar peso", quality_controls: ["Peso"] } },
  });
  const labels = sections.map(([label]) => label);
  assert.equal(labels.filter((label) => label === "Objetivo").length, 1);
  assert.equal(labels.filter((label) => label.includes("purpose") || label.includes("quality_controls")).length, 0);
});
