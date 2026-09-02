import test from "node:test";
import assert from "node:assert/strict";
import { additionalFieldMarkup, buildMetadataSections, mergeEditedMetadataData, metadataEditFields, validateAdditionalFieldDraft } from "../../uc_bib_solv/webapp/js/views/nodes/process-modeling.js";

test("renders row-level save and remove actions for additional metadata fields", () => {
  const markup = additionalFieldMarkup({ title: "Criterios", description: "Validar lote" }, 2);
  assert.match(markup, /data-pm-action="save-metadata-field"/);
  assert.match(markup, />Guardar campo<\/button>/);
  assert.match(markup, /data-pm-action="remove-metadata-field"/);
});

test("validates one additional field against the current modal draft", () => {
  assert.deepEqual(validateAdditionalFieldDraft([
    { title: " Criterios ", description: " Validar lote " },
    { title: "Trazabilidad", description: "Registrar evidencia" },
  ], 0), { title: "Criterios", description: "Validar lote" });
  assert.throws(() => validateAdditionalFieldDraft([{ title: "Criterios", description: "" }], 0), /título y descripción/);
  assert.throws(() => validateAdditionalFieldDraft([
    { title: "Criterios", description: "Uno" },
    { title: " criterios ", description: "Dos" },
  ], 1), /no pueden repetirse/);
});

test("creates one editable field per metadata.data child and preserves nested JSON", () => {
  assert.deepEqual(metadataEditFields({
    schema_version: 1,
    provenance: { source: "planner" },
    data: {
      purpose: "Dosificar",
      limits: { min: 1, max: 9 },
      checks: ["visual", "weight"],
      enabled: true,
      missing: null,
    },
  }), [
    { key: "purpose", value: "Dosificar", kind: "string", id: "pm-metadata-field-0" },
    { key: "limits", value: '{\n  "min": 1,\n  "max": 9\n}', kind: "json", id: "pm-metadata-field-1" },
    { key: "checks", value: '[\n  "visual",\n  "weight"\n]', kind: "json", id: "pm-metadata-field-2" },
    { key: "enabled", value: "true", kind: "boolean", id: "pm-metadata-field-3" },
    { key: "missing", value: "", kind: "null", id: "pm-metadata-field-4" },
  ]);
});

test("renders no fields for an empty metadata.data object", () => {
  assert.deepEqual(metadataEditFields({ schema_version: 1, data: {} }), []);
});

test("preserves the metadata envelope while replacing only data children", () => {
  const envelope = {
    schema_version: 1,
    provenance: { source: "planner" },
    data: { purpose: "old", unknown: { keep: true } },
  };
  const updated = mergeEditedMetadataData(envelope, {
    purpose: "new",
    unknown: { keep: false },
  });
  assert.deepEqual(updated, {
    schema_version: 1,
    provenance: { source: "planner" },
    data: { purpose: "new", unknown: { keep: false } },
  });
  assert.deepEqual(envelope.data, { purpose: "old", unknown: { keep: true } });
});

test("renders the canonical backend context projection", () => {
  const sections = Object.fromEntries(buildMetadataSections({ context_detail: {
    description: "Descripción funcional", objective: "Objetivo", inputs: ["Entrada"], controls: ["Control"], contracts_and_assignments: [{ machine_ref: "BA01" }], additional: {},
  } }));
  assert.equal(sections["Descripción funcional"], "Descripción funcional");
  assert.equal(sections["Objetivo"], "Objetivo");
  assert.deepEqual(sections["Entradas"], ["Entrada"]);
  assert.deepEqual(sections["Controles"], ["Control"]);
  assert.deepEqual(sections["Contratos y asignaciones"], [{ machine_ref: "BA01" }]);
});

test("renders canonical contracts from the backend projection", () => {
  const sections = Object.fromEntries(buildMetadataSections(
    { context_detail: { contracts_and_assignments: "Contrato vigente", additional: {} } },
  ));
  assert.equal(sections["Contratos y asignaciones"], "Contrato vigente");
});

test("renders contracts and assignments already combined by backend", () => {
  const sections = Object.fromEntries(buildMetadataSections({
    context_detail: { contracts_and_assignments: ["KPI bajo demanda", { machine_ref: "BA01" }], additional: {} },
  }));
  assert.deepEqual(sections["Contratos y asignaciones"], ["KPI bajo demanda", { machine_ref: "BA01" }]);
});

test("renders additional fields from the backend projection", () => {
  const sections = buildMetadataSections({
    context_detail: { objective: "Objetivo", additional: { calibration: { limits: { min: 1, max: 9 }, units: ["kg", "g"] }, checkpoints: [{ code: "CP-1", rules: ["visual", "weight"] }], sensor_snapshot: { values: [1, 2], status: "ok" }, provenance: { source: "planner" } } },
  });
  const byLabel = Object.fromEntries(sections);
  assert.deepEqual(byLabel["Clave: calibration"], { limits: { min: 1, max: 9 }, units: ["kg", "g"] });
  assert.deepEqual(byLabel["Clave: checkpoints"], [{ code: "CP-1", rules: ["visual", "weight"] }]);
  assert.deepEqual(byLabel["Clave: sensor_snapshot"], { values: [1, 2], status: "ok" });
  assert.deepEqual(byLabel["Clave: provenance"], { source: "planner" });
  assert.equal(sections.filter(([label]) => label === "Objetivo").length, 1);
});

test("does not render aliases because backend canonicalizes them", () => {
  const sections = buildMetadataSections({
    context_detail: { objective: "Alcanzar peso", controls: ["Peso"], additional: {} },
  });
  const labels = sections.map(([label]) => label);
  assert.equal(labels.filter((label) => label === "Objetivo").length, 1);
  assert.equal(labels.filter((label) => label.includes("purpose") || label.includes("quality_controls")).length, 0);
});
