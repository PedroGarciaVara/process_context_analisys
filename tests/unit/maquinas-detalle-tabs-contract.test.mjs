import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/maquinas/maquinas_detalle.js", import.meta.url), "utf8");

test("la creación de máquina no requiere un contexto de máquina existente", () => {
  assert.match(source, /machine\?\.contract_id/);
  assert.match(source, /machine\?\.contractId/);
  assert.match(source, /const context = machine \? await loadMachineContext\(machine\) : \{\}/);
});

test("el detalle de máquina declara tabs ARIA y oculta el panel inactivo", () => {
  assert.match(source, /role="tablist"/);
  assert.equal((source.match(/role="tab"/g) || []).length, 2);
  assert.match(source, /data-machine-page-panel="specific" hidden/);
  assert.match(source, /panel\.hidden = panel\.dataset\.machinePagePanel !== active/);
});
