import test from "node:test";
import assert from "node:assert/strict";
import { renderGraph } from "../../uc_bib_solv/webapp/js/components/process-modeling/graph.js";
import { createProcessModelingState } from "../../uc_bib_solv/webapp/js/core/process-modeling-state.js";

const version = {
  nodes: [
    { node_id: "source", node_code: "SRC", node_type: "operation", name: "Origen" },
    { node_id: "target", node_code: "OP-001", node_type: "operation", name: "Nueva operación" },
  ],
  transitions: [{ transition_id: "edge-1", source_node_id: "source", target_node_id: "target", transition_type: "sequence" }],
  diagram_transitions: [{ transition_id: "edge-1", source_node_id: "source", target_node_id: "target", transition_type: "sequence" }],
};

test("renderGraph conserva los elementos y la conexión creada desde la paleta", () => {
  const html = renderGraph(version);
  assert.match(html, /OP-001/);
  assert.match(html, /data-pm-edge="edge-1"/);
  assert.match(html, /Diagrama BPM del proceso/);
});

test("renderGraph renderiza la colección diagramable recibida sin filtrarla", () => {
  const projectedVersion = {
    nodes: version.nodes,
    transitions: [{ transition_id: "persisted-hidden", source_node_id: "source", target_node_id: "target", transition_type: "sequence" }],
    diagram_transitions: [{ transition_id: "backend-edge", source_node_id: "source", target_node_id: "target", transition_type: "sequence" }],
  };
  const html = renderGraph(projectedVersion);
  assert.match(html, /data-pm-edge="backend-edge"/);
  assert.doesNotMatch(html, /data-pm-edge="persisted-hidden"/);
});

test("renderGraph no reconstruye ni filtra transiciones fuera de la proyección backend", () => {
  const html = renderGraph({
    nodes: version.nodes,
    transitions: [{ transition_id: "persisted-edge", source_node_id: "source", target_node_id: "target", transition_type: "sequence" }],
  });
  assert.doesNotMatch(html, /data-pm-edge="persisted-edge"/);
});

test("renderGraph aplica el ancho común calculado a una cadena vertical heterogénea", () => {
  const heterogeneousVersion = {
    nodes: [
      { node_id: "operation", node_code: "OP", node_type: "operation", name: "Fabricación" },
      { node_id: "stock", node_code: "STOCK", node_type: "stock", name: "Stock final", properties: { stock: { capacity: 24, initial_quantity: 24, unit: "u" } } },
    ],
    transitions: [{ transition_id: "vertical-edge", source_node_id: "operation", target_node_id: "stock", transition_type: "sequence" }],
    diagram_transitions: [{ transition_id: "vertical-edge", source_node_id: "operation", target_node_id: "stock", transition_type: "sequence" }],
  };
  const html = renderGraph(heterogeneousVersion);
  const cards = [...html.matchAll(/data-node-id="([^"]+)"[^>]*style="left:([^;]+);top:[^;]+;width:([^p]+)px;height:/g)];
  const styles = Object.fromEntries(cards.map(([, id, left, width]) => [id, { left, width }]));
  assert.equal(styles.operation.left, styles.stock.left);
  assert.equal(styles.operation.width, styles.stock.width);
});

test("renderGraph coloca las ramas Sí/No de una decisión en lanes paralelos", () => {
  const decisionVersion = {
    nodes: [
      { node_id: "decision", node_code: "DEC", node_type: "decision", name: "¿Conforme?" },
      { node_id: "yes", node_code: "YES", node_type: "output", name: "Correcto" },
      { node_id: "no", node_code: "NO", node_type: "output", name: "Incorrecto" },
    ],
    diagram_transitions: [
      { transition_id: "yes-edge", source_node_id: "decision", target_node_id: "yes", transition_type: "BRANCH", label: "Sí" },
      { transition_id: "no-edge", source_node_id: "decision", target_node_id: "no", type: "branch", label: "No" },
    ],
  };
  const html = renderGraph(decisionVersion);
  const cards = Object.fromEntries([...html.matchAll(
    /data-node-id="([^"]+)"[^>]*style="left:([^;]+);top:([^;]+);width:([^p]+)px;height:/g,
  )].map(([, id, left, top, width]) => [id, {
    left: parseFloat(left),
    top: parseFloat(top),
    width: parseFloat(width),
  }]));
  assert.equal(cards.yes.top, cards.no.top);
  assert.ok(cards.yes.left + cards.yes.width < cards.no.left || cards.no.left + cards.no.width < cards.yes.left);
  assert.match(html, /data-pm-edge="yes-edge"/);
  assert.match(html, /data-pm-edge="no-edge"/);
});

test("el estado del modelador admite la selección de un nodo", () => {
  const state = createProcessModelingState();
  assert.equal(state.process, null);
  assert.equal(Object.hasOwn(state, "version"), false);
  assert.equal(state.selectedNodeId, "");
  state.selectedNodeId = "source";
  assert.equal(state.selectedNodeId, "source");
});
