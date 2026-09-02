export const DEFAULT_LAYOUT_METRICS = {
  canvasPadding: 42,
  layerGap: 72,
  branchGap: 58,
  laneGap: 72,
  nestedInset: 32,
  minCanvasWidth: 720,
  minCanvasHeight: 420,
  maxConnectorSegments: 4,
};

const TEXT_MEASURE_CACHE = new Map();

const SHAPE_BASE = {
  input: { minWidth: 150, minHeight: 120, horizontalPadding: 28 },
  output: { minWidth: 150, minHeight: 120, horizontalPadding: 28 },
  operation: { minWidth: 190, minHeight: 120, horizontalPadding: 18 },
  subprocess: { minWidth: 200, minHeight: 128, horizontalPadding: 18 },
  decision: { minWidth: 200, minHeight: 140, horizontalPadding: 22 },
  stock: { minWidth: 210, minHeight: 128, horizontalPadding: 18 },
};

function measureTextWidth(text, font) {
  const value = String(text ?? "");
  const cacheKey = `${font}::${value}`;
  if (TEXT_MEASURE_CACHE.has(cacheKey)) return TEXT_MEASURE_CACHE.get(cacheKey);
  let width = value.length * 8.4;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
      context.font = font;
      width = context.measureText(value).width;
    }
  }
  TEXT_MEASURE_CACHE.set(cacheKey, width);
  return width;
}

function wrapText(text, maxWidth, font) {
  const source = String(text ?? "").trim();
  if (!source) return [];
  const words = source.split(/\s+/);
  const lines = [];
  let current = words.shift() || "";
  words.forEach((word) => {
    const candidate = `${current} ${word}`.trim();
    if (measureTextWidth(candidate, font) <= maxWidth || !current) {
      current = candidate;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines;
}

function nodeSemanticText(node) {
  const properties = node?.properties || {};
  const detail = node?.metadata?.data || node?.metadata || {};
  const stock = properties.stock || {};
  const outputRole = node?.output_role || properties.output_role;
  if (node?.node_type === "stock") {
    return `Capacidad ${stock.capacity ?? "—"} · Inicial ${stock.initial_quantity ?? "—"} ${stock.unit || ""}`.trim();
  }
  if (node?.node_type === "output") {
    return `Salida: ${outputRole === "waste" ? "waste" : "normal"}`;
  }
  if (node?.node_type === "decision") return "Ramas Sí / No";
  return node?.description || detail.description || detail.operation_description || detail.detailed_description || detail.summary || "Sin descripción";
}

function measureBaseNode(node) {
  const shape = SHAPE_BASE[node?.node_type] || SHAPE_BASE.operation;
  const innerWidth = Math.max(120, shape.minWidth - shape.horizontalPadding * 2);
  const kickerWidth = measureTextWidth(node?.node_type || "", "700 10px Inter, sans-serif");
  const codeWidth = measureTextWidth(node?.node_code || "", "700 16px Inter, sans-serif");
  const nameLines = wrapText(node?.name || "", innerWidth, "700 14px Inter, sans-serif");
  const semanticLines = wrapText(nodeSemanticText(node), innerWidth, "400 12px Inter, sans-serif");
  const contentWidth = Math.max(
    kickerWidth,
    codeWidth,
    ...nameLines.map((line) => measureTextWidth(line, "700 14px Inter, sans-serif")),
    ...semanticLines.map((line) => measureTextWidth(line, "400 12px Inter, sans-serif")),
    0,
  );
  const width = Math.max(shape.minWidth, Math.ceil(contentWidth + shape.horizontalPadding * 2 + 12));
  const nameHeight = Math.max(1, nameLines.length) * 18;
  const semanticHeight = Math.max(1, semanticLines.length) * 16;
  const height = Math.max(shape.minHeight, Math.ceil(20 + 20 + nameHeight + semanticHeight + 34));
  return { width, height };
}

function estimateFlowBounds(process, dimensions) {
  const nodes = process?.nodes || [];
  const transitions = process?.diagram_transitions || process?.transitions || [];
  if (!nodes.length) return { width: DEFAULT_LAYOUT_METRICS.minCanvasWidth, height: DEFAULT_LAYOUT_METRICS.minCanvasHeight };

  const ids = nodes.map((node) => String(node.node_id));
  const incoming = Object.fromEntries(ids.map((id) => [id, 0]));
  const outgoing = Object.fromEntries(ids.map((id) => [id, []]));
  transitions.forEach((edge) => {
    const source = String(edge.source_node_id);
    const target = String(edge.target_node_id);
    if (outgoing[source] && incoming[target] !== undefined) {
      outgoing[source].push(target);
      incoming[target] += 1;
    }
  });

  const depths = Object.fromEntries(ids.map((id) => [id, 0]));
  const remaining = { ...incoming };
  const queue = ids.filter((id) => remaining[id] === 0);
  let visited = 0;
  while (queue.length) {
    const current = queue.shift();
    visited += 1;
    outgoing[current].forEach((target) => {
      depths[target] = Math.max(depths[target], depths[current] + 1);
      remaining[target] -= 1;
      if (remaining[target] === 0) queue.push(target);
    });
  }
  if (visited < ids.length) ids.forEach((id, index) => { depths[id] = Math.max(depths[id], index); });

  const layers = new Map();
  ids.forEach((id) => {
    const depth = depths[id] || 0;
    if (!layers.has(depth)) layers.set(depth, []);
    layers.get(depth).push(id);
  });
  let height = DEFAULT_LAYOUT_METRICS.canvasPadding * 2;
  let width = DEFAULT_LAYOUT_METRICS.minCanvasWidth;
  [...layers.values()].forEach((layer, index) => {
    const layerHeight = Math.max(...layer.map((id) => dimensions[id]?.height || 120));
    const layerWidth = layer.reduce((sum, id, nodeIndex) => sum + (dimensions[id]?.width || 190) + (nodeIndex ? DEFAULT_LAYOUT_METRICS.branchGap : 0), 0);
    width = Math.max(width, layerWidth + DEFAULT_LAYOUT_METRICS.canvasPadding * 2);
    height += layerHeight;
    if (index < layers.size - 1) height += DEFAULT_LAYOUT_METRICS.layerGap;
  });
  return { width, height };
}

function estimateTreeWidth(process, dimensions) {
  const nodes = process?.nodes || [];
  const transitions = process?.diagram_transitions || process?.transitions || [];
  if (!nodes.length) return DEFAULT_LAYOUT_METRICS.minCanvasWidth;
  const ids = nodes.map((node) => String(node.node_id));
  const incoming = Object.fromEntries(ids.map((id) => [id, []]));
  transitions.forEach((edge) => {
    const target = String(edge.target_node_id);
    if (incoming[target]) incoming[target].push(edge);
  });
  const parentOf = {};
  ids.forEach((id) => {
    const candidates = incoming[id] || [];
    if (!candidates.length) return;
    const branch = candidates.find((edge) => edge.transition_type === "branch");
    parentOf[id] = String((branch || candidates[0]).source_node_id);
  });
  const children = Object.fromEntries(ids.map((id) => [id, []]));
  Object.entries(parentOf).forEach(([child, parent]) => children[parent]?.push(child));
  const memo = {};
  const subtreeWidth = (id) => {
    if (memo[id]) return memo[id];
    const own = dimensions[id]?.width || 190;
    const descendants = children[id] || [];
    if (!descendants.length) return (memo[id] = own);
    const total = descendants.reduce((sum, child, index) => sum + subtreeWidth(child) + (index ? DEFAULT_LAYOUT_METRICS.branchGap : 0), 0);
    return (memo[id] = Math.max(own, total));
  };
  const roots = ids.filter((id) => !parentOf[id]);
  const total = roots.reduce((sum, root, index) => sum + subtreeWidth(root) + (index ? DEFAULT_LAYOUT_METRICS.laneGap : 0), 0);
  return total + DEFAULT_LAYOUT_METRICS.canvasPadding * 2;
}

export function measureDiagram(process, options = {}) {
  const nodes = process?.nodes || [];
  const expansionStack = options.expansionStack || [];
  const depth = options.depth || 0;
  const currentExpansions = expansionStack.filter((item) => item.depth === depth);
  const dimensions = {};
  const nestedLayouts = {};

  nodes.forEach((node) => {
    const nodeId = String(node.node_id);
    const expansion = currentExpansions.find((item) => String(item.nodeId) === nodeId);
    const base = measureBaseNode(node);
    if (!expansion) {
      dimensions[nodeId] = base;
      return;
    }
    const nested = measureDiagram(expansion.process, { ...options, depth: depth + 1, nested: true });
    const width = Math.max(base.width, nested.width + DEFAULT_LAYOUT_METRICS.nestedInset * 2);
    // Include the inline child header, container padding, borders and the
    // card margins. Without this allowance the nested flow can extend below
    // its subprocess card by a few dozen pixels.
    const height = Math.max(base.height, nested.height + 180);
    dimensions[nodeId] = { width, height };
    nestedLayouts[nodeId] = nested;
  });

  const estimated = estimateFlowBounds(process, dimensions);
  return {
    dimensions,
    nestedLayouts,
    width: Math.max(estimated.width, estimateTreeWidth(process, dimensions), DEFAULT_LAYOUT_METRICS.minCanvasWidth, ...Object.values(dimensions).map((entry) => entry.width + DEFAULT_LAYOUT_METRICS.canvasPadding * 2)),
    height: Math.max(estimated.height, DEFAULT_LAYOUT_METRICS.minCanvasHeight, ...Object.values(dimensions).map((entry) => entry.height + DEFAULT_LAYOUT_METRICS.canvasPadding * 2)),
  };
}
