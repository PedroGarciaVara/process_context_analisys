import test from "node:test";
import assert from "node:assert/strict";
import { computeProcessLayout } from "../../uc_bib_solv/webapp_java/webapp/js/components/process-modeling/layout.js";
import { measureDiagram } from "../../uc_bib_solv/webapp_java/webapp/js/components/process-modeling/measurement.js";

function overlaps(left, right) {
  return left.x < right.x + right.width
    && right.x < left.x + left.width
    && left.y < right.y + right.height
    && right.y < left.y + left.height;
}

test("centra una cadena vertical y evita solapes", () => {
  const version = {
    nodes: [
      { node_id: "a", node_code: "A", node_type: "operation", name: "Inicio" },
      { node_id: "b", node_code: "B", node_type: "operation", name: "Centro" },
      { node_id: "c", node_code: "C", node_type: "stock", name: "Final con stock", properties: { stock: { capacity: 24, initial_quantity: 24, unit: "u" } } },
    ],
    transitions: [
      { transition_id: "ab", source_node_id: "a", target_node_id: "b", transition_type: "sequence" },
      { transition_id: "bc", source_node_id: "b", target_node_id: "c", transition_type: "sequence" },
    ],
  };
  const measurement = measureDiagram(version);
  const layout = computeProcessLayout(version, measurement.dimensions, version.transitions);
  const positions = layout.positions;
  assert.ok(Math.abs(positions.a.centerX - positions.b.centerX) <= 1);
  assert.ok(Math.abs(positions.b.centerX - positions.c.centerX) <= 1);
  assert.equal(positions.a.x, positions.b.x);
  assert.equal(positions.b.x, positions.c.x);
  assert.ok(positions.b.y > positions.a.y);
  assert.ok(positions.c.y > positions.b.y);
  assert.equal(layout.routes.length, 2);
  assert.equal(overlaps(positions.a, positions.b), false);
  assert.equal(overlaps(positions.b, positions.c), false);
});

test("reserva lanes independientes para ramas aguas abajo", () => {
  const version = {
    nodes: [
      { node_id: "root", node_code: "ROOT", node_type: "operation", name: "Root" },
      { node_id: "decision", node_code: "DEC", node_type: "decision", name: "Decisión" },
      { node_id: "left", node_code: "LEFT", node_type: "operation", name: "Rama izquierda larga larga" },
      { node_id: "left2", node_code: "LEFT-2", node_type: "operation", name: "Descendiente izquierdo" },
      { node_id: "right", node_code: "RIGHT", node_type: "operation", name: "Rama derecha" },
      { node_id: "right2", node_code: "RIGHT-2", node_type: "operation", name: "Descendiente derecho" },
    ],
    transitions: [
      { transition_id: "t1", source_node_id: "root", target_node_id: "decision", transition_type: "sequence" },
      { transition_id: "t2", source_node_id: "decision", target_node_id: "left", transition_type: "branch", label: "Sí" },
      { transition_id: "t3", source_node_id: "decision", target_node_id: "right", transition_type: "branch", label: "No" },
      { transition_id: "t4", source_node_id: "left", target_node_id: "left2", transition_type: "sequence" },
      { transition_id: "t5", source_node_id: "right", target_node_id: "right2", transition_type: "sequence" },
    ],
  };
  const measurement = measureDiagram(version);
  const layout = computeProcessLayout(version, measurement.dimensions, version.transitions);
  const positions = layout.positions;
  assert.ok(Math.abs(positions.root.centerX - positions.decision.centerX) <= 1);
  assert.ok(positions.left.x + positions.left.width < positions.right.x || positions.right.x + positions.right.width < positions.left.x);
  assert.ok(Math.abs(positions.left.centerX - positions.left2.centerX) <= 1);
  assert.ok(Math.abs(positions.right.centerX - positions.right2.centerX) <= 1);
  assert.equal(layout.routes.length, 5);
  layout.routes.forEach((route) => {
    assert.ok(route.points.length <= 4);
  });
});

test("alinea las entradas de varias ramas bajo la tarjeta más alta", () => {
  const version = {
    nodes: [
      { node_id: "a", node_code: "A", node_type: "subprocess", name: "Rama corta" },
      { node_id: "b", node_code: "B", node_type: "subprocess", name: "Rama expandida" },
      { node_id: "target", node_code: "TARGET", node_type: "subprocess", name: "Fabricación" },
    ],
    transitions: [
      { transition_id: "at", source_node_id: "a", target_node_id: "target", transition_type: "sequence" },
      { transition_id: "bt", source_node_id: "b", target_node_id: "target", transition_type: "sequence" },
    ],
  };
  const dimensions = {
    a: { width: 200, height: 140 },
    b: { width: 220, height: 420 },
    target: { width: 240, height: 180 },
  };
  const layout = computeProcessLayout(version, dimensions, version.transitions);
  const incoming = layout.routes.filter((route) => route.edge.target_node_id === "target");
  assert.equal(incoming.length, 2);
  assert.equal(incoming[0].points[1].y, incoming[0].points[2].y);
  assert.equal(incoming[1].points[1].y, incoming[1].points[2].y);
  assert.equal(incoming[0].points[1].y, incoming[1].points[1].y);
  assert.ok(incoming[0].points[1].y > layout.positions.b.y + layout.positions.b.height);
});

test("prioriza la salida branch de una decisión frente a una secuencia posterior", () => {
  const version = {
    nodes: [
      { node_id: "decision", node_code: "DEC", node_type: "decision", name: "¿Conforme?" },
      { node_id: "ok", node_code: "OK", node_type: "output", name: "Correcto" },
      { node_id: "nok", node_code: "NOK", node_type: "output", name: "Incorrecto" },
    ],
    transitions: [
      { transition_id: "yes", source_node_id: "decision", target_node_id: "ok", transition_type: "branch", label: "Sí" },
      { transition_id: "no", source_node_id: "decision", target_node_id: "nok", transition_type: "branch", label: "No" },
      { transition_id: "continuation", source_node_id: "ok", target_node_id: "nok", transition_type: "sequence" },
    ],
  };
  const measurement = measureDiagram(version);
  const layout = computeProcessLayout(version, measurement.dimensions, version.transitions);
  assert.equal(layout.positions.ok.y, layout.positions.nok.y);
  assert.notEqual(layout.positions.ok.x, layout.positions.nok.x);
  const noRoute = layout.routes.find((route) => route.edge.transition_id === "no");
  assert.equal(noRoute.points[0].x, layout.positions.decision.centerX);
  assert.equal(noRoute.points.at(-1).x, layout.positions.nok.centerX);
});
