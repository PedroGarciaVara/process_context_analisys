import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const router = fs.readFileSync(new URL("../../uc_bib_solv/webapp/js/core/router.js", import.meta.url), "utf8");

test("las rutas legacy tienen aliases canónicos explícitos", () => {
  assert.match(router, /procesos:\s*"procesos_v02"/);
  assert.match(router, /contratos:\s*"contratos_v02"/);
  assert.match(router, /maquinas:\s*"maquinas_v02"/);
  assert.match(router, /arbol:\s*"arboles_v02"/);
  assert.match(router, /causa_detalle:\s*"causa_detalle_v02"/);
});

test("los aliases conservan los parámetros de consulta al normalizar la URL", () => {
  assert.match(router, /const queryIndex = rawHash\.indexOf\("\?"\)/);
  assert.match(router, /const canonicalHash = `#\/\$\{route\}\$\{query\}`/);
  assert.match(router, /history\.replaceState/);
});
