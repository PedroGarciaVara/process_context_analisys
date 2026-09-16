import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/maquinas/maquinas_detalle.js", import.meta.url), "utf8");

test("el detalle de máquina protege el contexto ausente en creación", () => {
  assert.match(source, /machine\?\.contract_id/);
  assert.match(source, /const context = machine \? await loadMachineContext\(machine\) : \{\}/);
  assert.match(source, /title: isNew \? "Nueva máquina"/);
  assert.doesNotMatch(source, /\|\| machine\.contract_id/);
});

test("el detalle conserva tabs accesibles y monta solo el panel activo", () => {
  assert.match(source, /role="tablist"/);
  assert.equal((source.match(/role="tab"/g) || []).length, 2);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /panel\.hidden = !selected/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /focus-visible:ring-2/);
});
