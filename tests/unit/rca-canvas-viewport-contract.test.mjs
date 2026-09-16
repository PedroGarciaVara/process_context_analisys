import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = new URL("../../uc_bib_solv/webapp/css/app.css", import.meta.url);

test("el lienzo RCA ocupa el viewport y no queda limitado a un recuadro fijo al hacer zoom", async () => {
  const source = await readFile(css, "utf8");
  assert.match(source, /\.acv2-canvas-shell[\s\S]*height: max\(620px, calc\(100vh - 300px\)\)/);
  assert.match(source, /\.acv2-canvas-shell[\s\S]*max-height: none; overflow: auto/);
  assert.match(source, /\.acv2-tree-stage[\s\S]*min-width: max\(100%, 760px\)/);
});
