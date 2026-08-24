import { computeProcessLayout } from "./layout.js";
import { measureDiagram } from "./measurement.js";

const NODE_SHAPES = {
  input: "input",
  output: "output",
  operation: "operation",
  subprocess: "subprocess",
  decision: "decision",
  stock: "stock",
};

const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function nodeSemanticText(node) {
  const properties = node?.properties || {};
  const detail = node?.metadata?.data || node?.metadata || {};
  const stock = properties.stock || {};
  const outputRole = node?.output_role || properties.output_role;
  if (node?.node_type === "stock") return `Capacidad ${stock.capacity ?? "—"} · Inicial ${stock.initial_quantity ?? "—"} ${stock.unit || ""}`.trim();
  if (node?.node_type === "output") return `Salida: ${outputRole === "waste" ? "waste" : "normal"}`;
  if (node?.node_type === "decision") return "Ramas Sí / No";
  return node?.description || detail.description || detail.operation_description || detail.detailed_description || detail.summary || "Sin descripción";
}

function transitionsForDiagram(nodes, transitions) {
  const decisionIds = new Set(nodes.filter((node) => node.node_type === "decision").map((node) => String(node.node_id)));
  const branchSources = new Set(transitions.filter((edge) => edge.transition_type === "branch").map((edge) => String(edge.source_node_id)));
  const branchTargets = new Set(transitions.filter((edge) => edge.transition_type === "branch").map((edge) => String(edge.target_node_id)));
  const redundantPairs = new Set();
  transitions
    .filter((edge) => edge.transition_type === "branch")
    .forEach((edge) => {
      transitions
        .filter((candidate) => String(candidate.source_node_id) === String(edge.source_node_id) && candidate.transition_type === "branch")
        .forEach((candidate) => redundantPairs.add(`${candidate.source_node_id}->${candidate.target_node_id}`));
    });
  return transitions.filter((edge) => {
    const sourceId = String(edge.source_node_id);
    const targetId = String(edge.target_node_id);
    const pairKey = `${edge.source_node_id}->${edge.target_node_id}`;
    if (edge.transition_type === "sequence" && redundantPairs.has(pairKey) && decisionIds.has(sourceId)) return false;
    // A legacy sequence between two alternatives of the same decision is a
    // continuation artifact, not a second visible branch. Rendering it would
    // make the No branch pass through the Sí output.
    if (edge.transition_type === "sequence" && branchTargets.has(sourceId) && branchTargets.has(targetId)) return false;
    return !decisionIds.has(sourceId) || !branchSources.has(sourceId) || edge.transition_type === "branch";
  });
}

function renderNode(node, position, dimensions, expansionStack = [], depth = 0) {
  const shape = NODE_SHAPES[node.node_type] || "operation";
  const outputRole = node.output_role || node?.properties?.output_role;
  const expandable = node.node_type === "subprocess" && node.child_process_id;
  const expansion = expandable ? expansionStack.find((item) => String(item.nodeId) === String(node.node_id) && item.depth === depth) : null;
  const expand = expandable && !expansion
    ? `<button type="button" class="pm-card-action" data-pm-action="expand-subprocess" data-pm-expand-node="${esc(node.node_id)}" data-pm-node-id="${esc(node.node_id)}" data-testid="pm-expand-subprocess" aria-label="Expandir subflujo de ${esc(node.name)}">Expandir subflujo</button>`
    : "";
  const inlineChild = expansion
    ? `<div class="pm-subprocess-container" data-pm-inline-child data-pm-expansion-depth="${depth}"><div class="pm-inline-child-header"><div><p class="pm-eyebrow">Subproceso expandido</p><h3>${esc(expansion.label || "Proceso hijo")}</h3></div><div class="pm-inline-child-actions"><button type="button" class="pm-secondary" data-pm-action="open-subprocess" data-pm-open-node="${esc(node.node_id)}" data-pm-open-depth="${depth}">Abrir subproceso</button><button type="button" class="pm-secondary" data-pm-action="collapse-subprocess" data-pm-collapse-node="${esc(node.node_id)}">Contraer</button></div></div>${renderGraph(expansion.version, { nested: true, expansionStack, depth: depth + 1 })}</div>`
    : "";
  const warning = node.node_type === "operation" && !node.child_process_id ? '<span class="pm-card-warning" role="note">Sin subproceso asociado</span>' : "";
  const label = `${node.node_type}: ${node.name}${outputRole ? `, ${outputRole}` : ""}`;
  const measuredBox = dimensions[String(node.node_id)] || { width: 190, height: 120 };
  // The layout may widen a card to the shared width of its vertical column.
  // Render that effective width so DOM geometry follows the calculated centers.
  const nodeBox = {
    ...measuredBox,
    width: position?.width || measuredBox.width,
  };
  return `<article class="pm-node pm-bpm-card pm-bpm-card-${shape}${inlineChild ? " pm-bpm-card-expanded" : ""}" data-node-id="${esc(node.node_id)}" data-pm-node-type="${esc(node.node_type)}" data-pm-expansion-depth="${depth}" data-pm-parent-version-id="${esc(node.version_id || "")}" ${expandable ? `data-pm-action="expand-subprocess" data-pm-expand-node="${esc(node.node_id)}" role="button"` : ""} style="left:${position.x}px;top:${position.y}px;width:${nodeBox.width}px;height:${nodeBox.height}px" tabindex="0" aria-label="${esc(label)}"><div class="pm-card-kicker">${esc(node.node_type === "decision" ? "Decisión" : node.node_type === "stock" ? "Stock" : node.node_type)}</div><strong class="pm-card-title">${esc(node.node_code)}</strong><span class="pm-card-name">${esc(node.name)}</span><span class="pm-card-description">${esc(nodeSemanticText(node))}</span>${warning}${expand}${inlineChild}</article>`;
}

function renderLegend() {
  return `<div class="pm-legend" aria-label="Leyenda BPM"><span class="pm-legend-title">Leyenda BPM</span><span class="pm-legend-item"><i class="pm-legend-shape pm-legend-circle"></i>Input / Output</span><span class="pm-legend-item"><i class="pm-legend-shape pm-legend-operation"></i>Operación</span><span class="pm-legend-item"><i class="pm-legend-shape pm-legend-subprocess"></i>Subproceso</span><span class="pm-legend-item"><i class="pm-legend-edge"></i>Relación dirigida</span></div>`;
}

function renderRoute(route) {
  const routeId = esc(route.edge.transition_id || `${route.edge.source_node_id}-${route.edge.target_node_id}`);
  const label = route.label
    ? `<g class="pm-edge-label"><rect x="${route.label.x - 20}" y="${route.label.y - 15}" width="40" height="24" rx="12"></rect><text x="${route.label.x}" y="${route.label.y + 2}" text-anchor="middle">${esc(route.label.text)}</text></g>`
    : "";
  return `<path class="pm-edge" data-pm-edge="${routeId}" d="${route.path}" />${label}`;
}

export function renderGraph(version, options = {}) {
  const nodes = version?.nodes || [];
  const transitions = transitionsForDiagram(nodes, version?.transitions || []);
  if (!nodes.length) return '<p class="pm-empty">La versión no tiene nodos.</p>';
  const expansionStack = options.expansionStack || [];
  const depth = options.depth || 0;
  const measurement = measureDiagram(version, { expansionStack, depth, nested: options.nested });
  const layout = computeProcessLayout(version, measurement.dimensions, transitions);
  const cards = nodes.map((node) => renderNode(node, layout.positions[String(node.node_id)], measurement.dimensions, expansionStack, depth)).join("");
  const paths = layout.routes.map((route) => renderRoute(route)).join("");
  const zoom = options.nested ? 1 : Math.min(1, Math.max(0.35, Number(options.zoom) || 1));
  const canvas = options.nested
    ? `<div class="pm-subprocess-mini-flow" style="width:${layout.width}px;height:${layout.height}px"><svg class="pm-edge-layer" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true"><defs><marker id="pm-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>${paths}</svg><div class="pm-flow-nodes">${cards}</div></div>`
    : `<div class="pm-flow-stage" style="width:${Math.ceil(layout.width * zoom)}px;height:${Math.ceil(layout.height * zoom)}px"><div class="pm-flow" style="width:${layout.width}px;height:${layout.height}px;transform:scale(${zoom})"><svg class="pm-edge-layer" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true"><defs><marker id="pm-arrow" markerWidth="10" markerHeight="5" refX="8" refY="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>${paths}</svg><div class="pm-flow-nodes">${cards}</div></div></div>`;
  if (options.nested) return canvas;
  return `<section id="pm-flow-zone" class="pm-bpm" aria-label="Diagrama BPM del proceso"><div class="pm-bpm-header"><div><p class="pm-eyebrow">Flujo semántico</p><h3>Diagrama BPM</h3></div><div class="pm-bpm-header-actions">${options.navigationControl || ""}<span class="pm-bpm-count">${nodes.length} nodos · ${transitions.length} relaciones</span>${options.zoomControl || ""}${options.fullscreenControl || ""}</div></div><div class="pm-flow-scroll" role="region" aria-label="Viewport desplazable del diagrama BPM" tabindex="0">${canvas}</div>${renderLegend()}</section>`;
}
