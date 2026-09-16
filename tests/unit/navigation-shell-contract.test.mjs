import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const navigationSources = [
  "../../uc_bib_solv/webapp/js/views/bpm/shell.js",
  "../../uc_bib_solv/webapp/js/views/inicio/inicio.js",
  "../../uc_bib_solv/webapp/js/views/maquinas/maquinas.js",
];

test("la barra lateral no renderiza el acceso rápido a la investigación BPM", () => {
  for (const sourcePath of navigationSources) {
    const source = fs.readFileSync(new URL(sourcePath, import.meta.url), "utf8");
    assert.doesNotMatch(source, /michelin-nav-context/);
    assert.doesNotMatch(source, /INV-2023-004/);
  }
});
