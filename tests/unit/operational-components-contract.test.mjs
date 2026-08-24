import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const machines = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/maquinas_v02.js", import.meta.url), "utf8");
const contracts = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/views/contratos_v02.js", import.meta.url), "utf8");
const stages = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/components/machine-stages.js", import.meta.url), "utf8");
const contractUi = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/components/contract-ui.js", import.meta.url), "utf8");

test("máquinas delega el renderizado de etapas al componente compartido", () => {
  assert.match(machines, /from "\.\.\/components\/machine-stages\.js"/);
  assert.match(machines, /stageEditorMarkup/);
  assert.match(machines, /stagePathsMarkup/);
  assert.match(stages, /data-stage-name/);
});

test("contratos delega badges y opciones al componente compartido", () => {
  assert.match(contracts, /from "\.\.\/components\/contract-ui\.js"/);
  assert.match(contracts, /statusBadge/);
  assert.match(contracts, /buildContractScopeOptions/);
  assert.match(contractUi, /No hay alcances BPM disponibles/);
});
