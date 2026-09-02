import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../uc_bib_solv/webapp/js/views/maquinas/maquinas.js", import.meta.url), "utf8");

test("el modal declara campos de máquina genérica y específica", () => {
  for (const id of [
    "machine-v02-type-name", "machine-v02-type-technology", "machine-v02-type-principle",
    "machine-v02-type-general-description", "machine-v02-type-capacity", "machine-v02-type-controls",
    "machine-v02-type-limitations", "machine-v02-type-characteristics", "machine-v02-name-field",
    "machine-v02-specific-description", "machine-v02-specific-characteristics", "machine-v02-specific-parameters",
    "machine-v02-specific-ranges", "machine-v02-specific-limitations", "machine-v02-specific-instructions",
    "machine-v02-specific-differences",
  ]) assert.match(source, new RegExp(`field\\(\\"${id}\\"`), `falta ${id}`);
});

test("la gestión de máquina enlaza el botón con el diálogo y carga el contexto activo", () => {
  assert.match(source, /data-action="machine-select"/);
  assert.match(source, /const openManagementModal = \(machineId = null\)/);
  assert.match(source, /buildMachineManagementModal\(activeMachine, state\)/);
  assert.match(source, /setModalVisible\(true\)/);
  assert.doesNotMatch(source, /data-action="machine-modal-open"/);
});

test("la página ofrece una acción explícita para crear una máquina sin mostrar IDs técnicos", () => {
  assert.match(source, /data-action=\"machine-modal-new\"/);
  assert.match(source, /Crear nueva máquina/);
  assert.doesNotMatch(source, />ID maquina</);
  assert.doesNotMatch(source, />operation_id</);
  assert.doesNotMatch(source, />process_version_id</);
  assert.doesNotMatch(source, />contract_id</);
});

test("editar una etapa no re-renderiza al hacer clic en su input", () => {
  assert.match(source, /let changed = false/);
  assert.match(source, /if \(changed\) renderStages\(\)/);
});

test("las etapas están disponibles para máquina genérica y específica", () => {
  assert.match(source, /Etapas de la operación BPM/);
  assert.match(source, /para la máquina genérica y la específica/);
  assert.equal((source.match(/data-stage-editor/g) || []).length, 1);
  assert.doesNotMatch(source, /data-stage-editor[^>]*>(?:(?!<\/section>)[\s\S])*<textarea/);
});
