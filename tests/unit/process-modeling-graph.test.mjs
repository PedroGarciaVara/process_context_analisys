import test from "node:test";
import assert from "node:assert/strict";
import { renderGraph } from "../../uc_bib_solv/webapp_java/webapp/js/components/process-modeling/graph.js";
import { createProcessModelingState } from "../../uc_bib_solv/webapp_java/webapp/js/core/process-modeling-state.js";
import { nextNodeCode } from "../../uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js";

const version = {
  nodes: [
    { node_id: "source", node_code: "SRC", node_type: "operation", name: "Origen" },
    { node_id: "target", node_code: "OP-001", node_type: "operation", name: "Nueva operación" },
  ],
  transitions: [{ transition_id: "edge-1", source_node_id: "source", target_node_id: "target", transition_type: "sequence" }],
};

test("renderGraph conserva los elementos y la conexión creada desde la paleta", () => {
  const html = renderGraph(version);
  assert.match(html, /OP-001/);
  assert.match(html, /data-pm-edge="edge-1"/);
  assert.match(html, /Diagrama BPM del proceso/);
});

test("renderGraph aplica el ancho común calculado a una cadena vertical heterogénea", () => {
  const heterogeneousVersion = {
    nodes: [
      { node_id: "operation", node_code: "OP", node_type: "operation", name: "Fabricación" },
      { node_id: "stock", node_code: "STOCK", node_type: "stock", name: "Stock final", properties: { stock: { capacity: 24, initial_quantity: 24, unit: "u" } } },
    ],
    transitions: [{ transition_id: "vertical-edge", source_node_id: "operation", target_node_id: "stock", transition_type: "sequence" }],
  };
  const html = renderGraph(heterogeneousVersion);
  const cards = [...html.matchAll(/data-node-id="([^"]+)"[^>]*style="left:([^;]+);top:[^;]+;width:([^p]+)px;height:/g)];
  const styles = Object.fromEntries(cards.map(([, id, left, width]) => [id, { left, width }]));
  assert.equal(styles.operation.left, styles.stock.left);
  assert.equal(styles.operation.width, styles.stock.width);
});

test("el estado del modelador admite la selección de un nodo", () => {
  const state = createProcessModelingState();
  assert.equal(state.selectedNodeId, "");
  state.selectedNodeId = "source";
  assert.equal(state.selectedNodeId, "source");
});

test("genera códigos por tipo sin repetir los existentes", () => {
  const nodes = [{ node_code: "OP-001" }, { node_code: "OP-003" }, { node_code: "STOCK-001" }];
  assert.equal(nextNodeCode(nodes, "operation"), "OP-002");
  assert.equal(nextNodeCode(nodes, "stock"), "STOCK-002");
  assert.equal(nextNodeCode(nodes, "decision"), "DECISION-001");
});
