import { DEFAULT_LAYOUT_METRICS } from "./measurement.js";

function normalizeTransitions(transitions = []) {
  return transitions.map((edge) => ({
    ...edge,
    transition_type: String(edge.transition_type || edge.type || "sequence").toLowerCase(),
  }));
}

function sortEdges(edges = []) {
  return [...edges].sort((left, right) => {
    const source = String(left.source_node_id).localeCompare(String(right.source_node_id));
    if (source) return source;
    const target = String(left.target_node_id).localeCompare(String(right.target_node_id));
    if (target) return target;
    return String(left.transition_id || "").localeCompare(String(right.transition_id || ""));
  });
}

function buildGraph(nodes, transitions) {
  const nodeIds = nodes.map((node) => String(node.node_id));
  const nodeMap = Object.fromEntries(nodes.map((node) => [String(node.node_id), node]));
  const outgoing = Object.fromEntries(nodeIds.map((nodeId) => [nodeId, []]));
  const incoming = Object.fromEntries(nodeIds.map((nodeId) => [nodeId, []]));
  const orderedTransitions = sortEdges(transitions).filter((edge) => outgoing[String(edge.source_node_id)] && incoming[String(edge.target_node_id)]);
  orderedTransitions.forEach((edge) => {
    const sourceId = String(edge.source_node_id);
    const targetId = String(edge.target_node_id);
    outgoing[sourceId].push(edge);
    incoming[targetId].push(edge);
  });
  return { nodeIds, nodeMap, outgoing, incoming, orderedTransitions };
}

function computeDepths(graph) {
  const indegree = Object.fromEntries(graph.nodeIds.map((nodeId) => [nodeId, graph.incoming[nodeId].length]));
  const queue = graph.nodeIds.filter((nodeId) => indegree[nodeId] === 0);
  const depth = Object.fromEntries(graph.nodeIds.map((nodeId) => [nodeId, 0]));
  const remaining = { ...indegree };
  while (queue.length) {
    const currentId = queue.shift();
    graph.outgoing[currentId].forEach((edge) => {
      const targetId = String(edge.target_node_id);
      depth[targetId] = Math.max(depth[targetId], depth[currentId] + 1);
      remaining[targetId] -= 1;
      if (remaining[targetId] === 0) queue.push(targetId);
    });
  }
  graph.nodeIds.forEach((nodeId, index) => {
    if (remaining[nodeId] > 0) depth[nodeId] = Math.max(depth[nodeId], index);
  });
  // A decision branch owns the first visual level of its target. If the
  // persisted graph also contains a later sequence into that target, the
  // sequence must not push the branch target below its sibling and make the
  // direct branch connector cross another node.
  graph.nodeIds.forEach((nodeId) => {
    const branchSources = graph.incoming[nodeId]
      .filter((edge) => edge.transition_type === "branch")
      .map((edge) => depth[String(edge.source_node_id)] + 1);
    if (branchSources.length) depth[nodeId] = Math.min(depth[nodeId], ...branchSources);
  });
  // A decision is a visual fork, not a sequential step. Keep both branch
  // destinations on the same next layer even when a persisted continuation
  // gives one of them an additional incoming path.
  graph.nodeIds.forEach((nodeId) => {
    if (graph.nodeMap[nodeId]?.node_type !== "decision") return;
    const branchTargets = graph.outgoing[nodeId]
      .filter((edge) => edge.transition_type === "branch")
      .map((edge) => String(edge.target_node_id));
    branchTargets.forEach((targetId) => {
      depth[targetId] = depth[nodeId] + 1;
    });
  });
  return depth;
}

function branchOrder(edge) {
  const label = String(edge?.label || edge?.condition || "").trim().toLocaleLowerCase();
  if (label === "sí" || label === "si" || label === "yes") return 0;
  if (label === "no") return 1;
  return 2;
}

function buildTree(graph, depths) {
  const parentOf = {};
  graph.nodeIds.forEach((nodeId) => {
    const candidates = graph.incoming[nodeId];
    if (!candidates.length) return;
    const chosen = [...candidates].sort((left, right) => {
      const leftBranch = left.transition_type === "branch" ? 1 : 0;
      const rightBranch = right.transition_type === "branch" ? 1 : 0;
      if (leftBranch !== rightBranch) return rightBranch - leftBranch;
      const leftDepth = depths[String(left.source_node_id)] ?? 0;
      const rightDepth = depths[String(right.source_node_id)] ?? 0;
      // A branch target is rendered at the first branch level (see
      // computeDepths). Its visual parent must therefore be the shallowest
      // branch source; choosing a later converging branch would place the
      // target in an earlier layer under a distant parent and can overlap
      // the main flow in that layer.
      if (leftBranch && rightBranch && leftDepth !== rightDepth) return leftDepth - rightDepth;
      if (leftDepth !== rightDepth) return rightDepth - leftDepth;
      return String(left.transition_id || "").localeCompare(String(right.transition_id || ""));
    })[0];
    parentOf[nodeId] = String(chosen.source_node_id);
  });
  const children = Object.fromEntries(graph.nodeIds.map((nodeId) => [nodeId, []]));
  Object.entries(parentOf).forEach(([nodeId, parentId]) => children[parentId]?.push(nodeId));
  Object.values(children).forEach((entries) => entries.sort((left, right) => {
    const leftDepth = depths[left] ?? 0;
    const rightDepth = depths[right] ?? 0;
    if (leftDepth !== rightDepth) return leftDepth - rightDepth;
    return left.localeCompare(right);
  }));
  // Give the two exits of a decision a deterministic left/right lane. The
  // semantic label remains on the transition; this only stabilizes geometry.
  graph.nodeIds.forEach((nodeId) => {
    if (graph.nodeMap[nodeId]?.node_type !== "decision") return;
    const branchEdges = graph.outgoing[nodeId].filter((edge) => edge.transition_type === "branch");
    const branchRank = new Map(branchEdges.map((edge) => [String(edge.target_node_id), branchOrder(edge)]));
    children[nodeId].sort((left, right) => {
      const leftRank = branchRank.get(left) ?? 2;
      const rightRank = branchRank.get(right) ?? 2;
      return leftRank - rightRank || left.localeCompare(right);
    });
  });
  return { parentOf, children };
}

function computeLayerTops(depths, dimensions) {
  const layerHeights = {};
  Object.entries(depths).forEach(([nodeId, depth]) => {
    layerHeights[depth] = Math.max(layerHeights[depth] || 0, dimensions[nodeId]?.height || 120);
  });
  const layerTops = {};
  let top = DEFAULT_LAYOUT_METRICS.canvasPadding;
  Object.keys(layerHeights).map(Number).sort((left, right) => left - right).forEach((depth) => {
    layerTops[depth] = top;
    top += layerHeights[depth] + DEFAULT_LAYOUT_METRICS.layerGap;
  });
  return { layerHeights, layerTops };
}

function computeSubtreeWidths(nodeId, tree, dimensions, columnWidths, memo) {
  if (memo[nodeId]) return memo[nodeId];
  // `placeTree` renders the shared width of a vertical column. Reserve that
  // same effective width while sizing the parent subtree; otherwise a wider
  // descendant can consume the branch gap after placement and overlap a
  // sibling that converges into the same layer.
  const ownWidth = columnWidths[nodeId] || dimensions[nodeId]?.width || 190;
  const children = tree.children[nodeId] || [];
  if (!children.length) {
    memo[nodeId] = ownWidth;
    return memo[nodeId];
  }
  if (children.length === 1) {
    memo[nodeId] = Math.max(ownWidth, computeSubtreeWidths(children[0], tree, dimensions, columnWidths, memo));
    return memo[nodeId];
  }
  const total = children.reduce((sum, childId, index) => sum + computeSubtreeWidths(childId, tree, dimensions, columnWidths, memo) + (index ? DEFAULT_LAYOUT_METRICS.branchGap : 0), 0);
  memo[nodeId] = Math.max(ownWidth, total);
  return memo[nodeId];
}

function computeVerticalColumnWidths(roots, tree, dimensions) {
  const columnWidths = {};
  const visited = new Set();

  function assignChain(startId) {
    if (visited.has(startId)) return;
    const chain = [];
    let currentId = startId;
    while (currentId && !visited.has(currentId)) {
      chain.push(currentId);
      visited.add(currentId);
      const children = tree.children[currentId] || [];
      currentId = children.length === 1 ? children[0] : null;
    }
    const width = Math.max(...chain.map((nodeId) => dimensions[nodeId]?.width || 190));
    chain.forEach((nodeId) => {
      columnWidths[nodeId] = width;
    });
    const terminalId = chain[chain.length - 1];
    (tree.children[terminalId] || []).forEach(assignChain);
  }

  roots.forEach(assignChain);
  Object.keys(tree.children).forEach((nodeId) => assignChain(nodeId));
  return columnWidths;
}

function placeTree(nodeId, centerX, tree, dimensions, depths, layerTops, positions, subtreeWidths, columnWidths) {
  const width = columnWidths[nodeId] || dimensions[nodeId]?.width || 190;
  const depth = depths[nodeId] || 0;
  positions[nodeId] = {
    // Preserve half-pixel centers for symmetric branch groups. Rounding each
    // sibling independently can move the visual group by 0.5 px.
    x: centerX - width / 2,
    y: Math.round(layerTops[depth]),
    width,
    height: dimensions[nodeId]?.height || 120,
    centerX,
  };
  const children = tree.children[nodeId] || [];
  if (!children.length) return;
  if (children.length === 1) {
    placeTree(children[0], centerX, tree, dimensions, depths, layerTops, positions, subtreeWidths, columnWidths);
    return;
  }
  const totalWidth = children.reduce((sum, childId, index) => sum + subtreeWidths[childId] + (index ? DEFAULT_LAYOUT_METRICS.branchGap : 0), 0);
  let cursor = centerX - totalWidth / 2;
  children.forEach((childId) => {
    const childWidth = subtreeWidths[childId];
    const childCenter = cursor + childWidth / 2;
    placeTree(childId, childCenter, tree, dimensions, depths, layerTops, positions, subtreeWidths, columnWidths);
    cursor += childWidth + DEFAULT_LAYOUT_METRICS.branchGap;
  });
}

function shiftIntoCanvas(positions) {
  const minX = Math.min(...Object.values(positions).map((position) => position.x));
  if (minX >= DEFAULT_LAYOUT_METRICS.canvasPadding) return;
  const delta = DEFAULT_LAYOUT_METRICS.canvasPadding - minX;
  Object.values(positions).forEach((position) => {
    position.x += delta;
    position.centerX += delta;
  });
}

function bboxFor(position) {
  return {
    left: position.x,
    top: position.y,
    right: position.x + position.width,
    bottom: position.y + position.height,
  };
}

function routeLabel(edge, points) {
  const label = edge.label || edge.condition || "";
  if (edge.transition_type !== "branch" || !label || points.length < 3) return null;
  const start = points[1];
  const end = points[2];
  return {
    text: label,
    x: Math.round((start.x + end.x) / 2),
    y: Math.round(start.y - 12),
  };
}

function buildMergeLevels(transitions, positions) {
  const incoming = new Map();
  transitions.forEach((edge) => {
    const targetId = String(edge.target_node_id);
    const source = positions[String(edge.source_node_id)];
    const target = positions[targetId];
    if (!source || !target || target.y <= source.y) return;
    if (!incoming.has(targetId)) incoming.set(targetId, []);
    incoming.get(targetId).push(source.y + source.height);
  });
  const mergeLevels = new Map();
  incoming.forEach((bottoms, targetId) => {
    if (bottoms.length < 2) return;
    const target = positions[targetId];
    // Every incoming branch reaches one horizontal bus below the tallest
    // source card. This prevents a shorter branch from crossing a taller
    // expanded subprocess and makes fan-in visually legible.
    mergeLevels.set(targetId, Math.min(
      target.y - 24,
      Math.max(...bottoms) + DEFAULT_LAYOUT_METRICS.branchGap,
    ));
  });
  return mergeLevels;
}

function buildRoute(edge, positions, mergeLevels = new Map()) {
  const source = positions[String(edge.source_node_id)];
  const target = positions[String(edge.target_node_id)];
  if (!source || !target) return null;
  const start = { x: source.centerX, y: source.y + source.height };
  const end = { x: target.centerX, y: target.y };
  if (target.y > source.y) {
    const midY = Math.round(mergeLevels.get(String(edge.target_node_id)) ?? ((start.y + end.y) / 2));
    const points = [
      start,
      { x: start.x, y: midY },
      { x: end.x, y: midY },
      end,
    ];
    return { edge, points, label: routeLabel(edge, points) };
  }
  const exitX = source.centerX <= target.centerX ? source.x + source.width : source.x;
  const entryX = source.centerX <= target.centerX ? target.x : target.x + target.width;
  const sideX = source.centerX <= target.centerX
    ? Math.max(exitX, entryX) + 28
    : Math.min(exitX, entryX) - 28;
  const startSide = { x: exitX, y: source.y + Math.round(source.height / 2) };
  const endSide = { x: entryX, y: target.y + Math.round(target.height / 2) };
  const points = [
    startSide,
    { x: sideX, y: startSide.y },
    { x: sideX, y: endSide.y },
    endSide,
  ];
  return { edge, points, label: routeLabel(edge, points) };
}

function pathFromPoints(points = []) {
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
}

function buildCanvas(positions, routes) {
  const boxes = Object.values(positions).map(bboxFor);
  const routePoints = routes.flatMap((route) => route?.points || []);
  const maxX = Math.max(...boxes.map((box) => box.right), ...routePoints.map((point) => point.x), DEFAULT_LAYOUT_METRICS.minCanvasWidth - DEFAULT_LAYOUT_METRICS.canvasPadding);
  const maxY = Math.max(...boxes.map((box) => box.bottom), ...routePoints.map((point) => point.y), DEFAULT_LAYOUT_METRICS.minCanvasHeight - DEFAULT_LAYOUT_METRICS.canvasPadding);
  return {
    width: Math.max(DEFAULT_LAYOUT_METRICS.minCanvasWidth, Math.ceil(maxX + DEFAULT_LAYOUT_METRICS.canvasPadding)),
    height: Math.max(DEFAULT_LAYOUT_METRICS.minCanvasHeight, Math.ceil(maxY + DEFAULT_LAYOUT_METRICS.canvasPadding)),
  };
}

export function computeProcessLayout(process, dimensions, transitions) {
  const nodes = process?.nodes || [];
  if (!nodes.length) {
    return { positions: {}, routes: [], width: DEFAULT_LAYOUT_METRICS.minCanvasWidth, height: DEFAULT_LAYOUT_METRICS.minCanvasHeight };
  }
  const diagramTransitions = normalizeTransitions(transitions);
  const graph = buildGraph(nodes, diagramTransitions);
  const depths = computeDepths(graph);
  const tree = buildTree(graph, depths);
  const { layerTops } = computeLayerTops(depths, dimensions);
  const subtreeWidths = {};
  const roots = graph.nodeIds.filter((nodeId) => !tree.parentOf[nodeId]).sort((left, right) => {
    const depthDelta = (depths[left] ?? 0) - (depths[right] ?? 0);
    if (depthDelta) return depthDelta;
    return left.localeCompare(right);
  });
  const columnWidths = computeVerticalColumnWidths(roots, tree, dimensions);
  roots.forEach((rootId) => computeSubtreeWidths(rootId, tree, dimensions, columnWidths, subtreeWidths));
  const totalWidth = roots.reduce((sum, rootId, index) => sum + subtreeWidths[rootId] + (index ? DEFAULT_LAYOUT_METRICS.laneGap : 0), 0);
  const positions = {};
  let cursor = DEFAULT_LAYOUT_METRICS.canvasPadding + totalWidth / 2 * -1;
  const centerBase = DEFAULT_LAYOUT_METRICS.canvasPadding + totalWidth / 2;
  cursor = centerBase - totalWidth / 2;
  roots.forEach((rootId) => {
    const rootCenter = cursor + subtreeWidths[rootId] / 2;
    placeTree(rootId, rootCenter, tree, dimensions, depths, layerTops, positions, subtreeWidths, columnWidths);
    cursor += subtreeWidths[rootId] + DEFAULT_LAYOUT_METRICS.laneGap;
  });
  shiftIntoCanvas(positions);
  const mergeLevels = buildMergeLevels(diagramTransitions, positions);
  const routes = diagramTransitions.map((edge) => buildRoute(edge, positions, mergeLevels)).filter(Boolean).map((route) => ({
    ...route,
    path: pathFromPoints(route.points),
  }));
  const canvas = buildCanvas(positions, routes);
  return { positions, routes, width: canvas.width, height: canvas.height, depths, subtreeWidths, columnWidths };
}
