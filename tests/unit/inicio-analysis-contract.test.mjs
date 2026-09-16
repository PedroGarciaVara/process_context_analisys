import test from "node:test";
import assert from "node:assert/strict";
import { analysisOperationOptions, filterAnalyses, countCauseNodes } from "../../uc_bib_solv/webapp/js/core/inicio-analysis.js";

test("las opciones de operación son únicas y acotadas al proceso", () => {
  const machines = [{ processId: "p1", operations: [
    { operation_id: "o1", process_id: "p1", name: "Corte" },
    { operation_id: "o1", process_id: "p1", name: "Corte" },
    { operation_id: "o2", process_id: "p2", operational_process_id: "p2", name: "Pulido" },
  ] }];
  assert.deepEqual(analysisOperationOptions(machines, "p1").map((item) => item.value), ["o1|p1"]);
});

test("el filtro conserva estado, máquina y operación", () => {
  const items = [{ id: 1, estado: "abierto", proceso_id: "p1", maquina_id: "m1", operation_id: "o1" }, { id: 2, estado: "cerrado", proceso_id: "p1", maquina_id: "m1", operation_id: "o1" }];
  assert.deepEqual(filterAnalyses(items, { status: "abierto", processId: "p1", machineId: "m1", operationKey: "o1|p1" }, []), [items[0]]);
});

test("countCauseNodes recorre árboles profundos", () => {
  assert.equal(countCauseNodes([{ node_type: "CAUSE", children: [{ node_type: "CAUSE" }] }]), 2);
});
