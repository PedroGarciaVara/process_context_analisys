import test from "node:test";
import assert from "node:assert/strict";

import {
  addStructuredRow, createStructuredDraft, moveStructuredRow,
  serializeStructuredDraft, updateStructuredRow,
} from "../../uc_bib_solv/webapp/js/components/structured-field-model.js";

test("round-trip conserva objetos, tipos y claves desconocidas", () => {
  const original = [{ name: "Presión", description: "Entrada", value: 3.5, unit: "bar", extension: { source: "PLC" } }];
  const draft = createStructuredDraft("specific_parameters", original, { kind: "list" });
  assert.deepEqual(serializeStructuredDraft(draft), { value: original, errors: [] });
});

test("editar título y descripción solo parchea esas propiedades", () => {
  const original = [{ nombre: "Peso", descripcion: "Objetivo", min: 10, max: 12 }];
  let draft = createStructuredDraft("specific_operating_ranges", original, { kind: "list" });
  draft = updateStructuredRow(draft, draft.rows[0].id, { title: "Peso neto", description: "Rango aprobado" });
  assert.deepEqual(serializeStructuredDraft(draft).value, [{ nombre: "Peso neto", descripcion: "Rango aprobado", min: 10, max: 12 }]);
});

test("lista de cadenas permanece lista de cadenas mientras no añade descripción", () => {
  let draft = createStructuredDraft("inputs", ["Receta", "Materia prima"], { kind: "list" });
  draft = updateStructuredRow(draft, draft.rows[0].id, { title: "Receta liberada" });
  assert.deepEqual(serializeStructuredDraft(draft).value, ["Receta liberada", "Materia prima"]);
});

test("añadir descripción a escalar crea objeto legible", () => {
  let draft = createStructuredDraft("inputs", ["Receta"], { kind: "list" });
  draft = updateStructuredRow(draft, draft.rows[0].id, { description: "Versión aprobada" });
  assert.deepEqual(serializeStructuredDraft(draft).value, [{ name: "Receta", description: "Versión aprobada" }]);
});

test("propiedades conservan números, booleanos y estructuras complejas", () => {
  const original = { amount: 25, enabled: true, unit: "kg", source: { system: "MES" } };
  let draft = createStructuredDraft("nominal_capacity", original, { kind: "object" });
  const amount = draft.rows.find((row) => row.title === "amount");
  draft = updateStructuredRow(draft, amount.id, { description: "30" });
  const result = serializeStructuredDraft(draft);
  assert.deepEqual(result.value, { amount: 30, enabled: true, unit: "kg", source: { system: "MES" } });
});

test("reordenar mueve el objeto completo", () => {
  let draft = createStructuredDraft("parameters", [{ name: "A", x: 1 }, { name: "B", x: 2 }], { kind: "list" });
  draft = moveStructuredRow(draft, draft.rows[1].id, "up");
  assert.deepEqual(serializeStructuredDraft(draft).value, [{ name: "B", x: 2 }, { name: "A", x: 1 }]);
});

test("fila nueva exige título", () => {
  let draft = createStructuredDraft("parameters", [], { kind: "list" });
  draft = addStructuredRow(draft).draft;
  assert.equal(serializeStructuredDraft(draft).errors[0].code, "required_title");
});

test("objeto rechaza claves duplicadas", () => {
  const draft = createStructuredDraft("nominal_capacity", { value: 25, unit: "kg" }, { kind: "object" });
  const changed = updateStructuredRow(draft, draft.rows[1].id, { title: "value" });
  assert.equal(serializeStructuredDraft(changed).errors[0].code, "duplicate_key");
});
