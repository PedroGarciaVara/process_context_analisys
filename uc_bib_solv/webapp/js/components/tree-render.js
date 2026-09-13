import {
  canDropTreeNode,
  findNodeById,
  findParentId,
  isTreeNodeMovable,
  readStatus,
  readableTreeContractLabel,
} from "./tree-data.js";

const TREE_CARD_WIDTH = 320;
const TREE_CHILD_GAP = 40;
const STATUS_COLORS = {
  retained: "#16a34a",
  discarded: "#dc2626",
  pending: "#f59e0b",
};

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined && text !== null) {
    element.textContent = text;
  }
  return element;
}

function translateTreeLabel(value, fallback = "") {
  const text = String(value || "").trim();
  if (!text) {
    return fallback;
  }

  const normalized = text.toLowerCase();
  const translations = {
    "focused node": "Nodo enfocado",
    "no active analysis": "Sin analisis activo",
    retained: "Retenida",
    discarded: "Descartada",
    pending: "Pendiente",
    "tree view": "Vista de arbol",
  };

  if (translations[normalized]) {
    return translations[normalized];
  }

  return text
    .replaceAll(/No active analysis/gi, "Sin analisis activo")
    .replaceAll(/Focused node/gi, "Nodo enfocado")
    .replaceAll(/\bRetained\b/gi, "Retenida")
    .replaceAll(/\bDiscarded\b/gi, "Descartada")
    .replaceAll(/\bPending\b/gi, "Pendiente")
    .replaceAll(/Tree View/gi, "Vista de arbol")
    .replaceAll(/Projected DAG/gi, "DAG proyectado")
    .replaceAll(/Shared node/gi, "Nodo compartido")
    .replaceAll(/Auto projected/gi, "Proyeccion automatica");
}

function readProjectionMetadata(payload) {
  const graphMetadata = payload?.graph_metadata || {};
  const reusedNodeIds = Array.isArray(graphMetadata.reused_node_ids)
    ? graphMetadata.reused_node_ids.map((value) => String(value))
    : [];
  const dependentContractIds = Array.isArray(graphMetadata.dependent_contract_ids)
    ? graphMetadata.dependent_contract_ids.map((value) => String(value))
    : [];
  const dependentContractCount = Number.isFinite(graphMetadata.dependent_contract_count)
    ? Number(graphMetadata.dependent_contract_count)
    : dependentContractIds.length;
  const projectionMode = String(graphMetadata.projection_mode || "").trim();
  return {
    graphMetadata,
    projectionMode,
    reusedNodeIds,
    reusedNodeIdSet: new Set(reusedNodeIds),
    reusedNodeCount: reusedNodeIds.length,
    dependentContractCount,
    hasProjectedScope: Boolean(
      graphMetadata.includes_dependent_contracts
      || dependentContractCount > 0
      || projectionMode,
    ),
  };
}

function buildProjectionSummary(payload) {
  const metadata = readProjectionMetadata(payload);
  if (!metadata.hasProjectedScope) {
    return null;
  }
  if (metadata.dependentContractCount > 0) {
    return {
      label: `${metadata.dependentContractCount} contrato(s) dependiente(s) incluido(s)`,
      description: "El backend ya agrego automaticamente contratos aguas abajo y sus causas dentro de esta misma proyeccion.",
      tone: "strong",
    };
  }
  if (metadata.reusedNodeCount > 0) {
    return {
      label: `${metadata.reusedNodeCount} nodo(s) compartido(s) en proyeccion`,
      description: "La vista mantiene el arbol actual, pero ya incorpora causas reutilizadas o alcanzadas desde dependencias del DAG.",
      tone: "accent",
    };
  }
  return {
    label: "Contratos dependientes auto-proyectados",
    description: "Cuando existen dependencias contractuales, el backend puede incorporarlas en el arbol y en el analisis sin cambiar la interaccion base.",
    tone: "neutral",
  };
}

function renderStatusChip(state, focus = false) {
  const chip = createElement("span", `acv2-state-chip acv2-state-${state} ${focus ? "acv2-state-focus" : ""}`.trim());
  const ok = createElement("span", "acv2-state-tick acv2-state-tick-ok", "✓");
  const ko = createElement("span", "acv2-state-tick acv2-state-tick-ko", "✕");
  chip.append(ok, ko);
  return chip;
}

function renderHypothesisSummary(hypotheses, limit = 2, showEvaluation = false) {
  const summary = createElement("div", "acv2-tree-hypothesis-list");
  const slice = (hypotheses || []).slice(0, limit);
  if (slice.length === 0) {
    const empty = createElement("div", "acv2-empty-state", "Sin hipotesis");
    empty.style.padding = "0.5rem 0.6rem";
    summary.appendChild(empty);
    return summary;
  }
  slice.forEach((hypothesis) => {
    const item = createElement("div", "acv2-tree-hypothesis-item");
    if (hypothesis.id !== undefined && hypothesis.id !== null) {
      item.dataset.hypothesisId = String(hypothesis.id);
    }
    const main = createElement("div", "acv2-tree-hypothesis-main");
    const titleValue = hypothesis.nombre || hypothesis.name || hypothesis.descripcion || "Hipotesis sin titulo";
    const descriptionValue = hypothesis.descripcion || "";
    const title = createElement("div", "acv2-tree-hypothesis-title", titleValue);
    main.append(title);
    if (descriptionValue && descriptionValue !== titleValue) {
      main.appendChild(createElement("div", "acv2-tree-hypothesis-meta", descriptionValue));
    }
    item.append(main);
    if (showEvaluation) {
      const state = readStatus(hypothesis.analysis_result?.evaluacion || hypothesis.estado);
      item.appendChild(renderStatusChip(state));
    }
    summary.appendChild(item);
  });
  if ((hypotheses || []).length > limit) {
    const more = createElement("div", "acv2-tree-hypothesis-meta", `+${hypotheses.length - limit} hipotesis mas`);
    summary.appendChild(more);
  }
  return summary;
}

function isHypothesisNode(node) {
  return String(node?.node_type || node?.tipo || "").toUpperCase() === "HYPOTHESIS";
}

export function getRenderableTreeChildren(node, mode) {
  const children = Array.isArray(node?.children) ? node.children : [];
  // Hypotheses are rendered as part of their cause card. Keeping them out of
  // the DAG layout avoids showing the same hypothesis once in the card and
  // once again as an independent diagram node in analysis mode.
  if (mode === "arbol" || mode === "analisis_causas_v2") {
    return children.filter((child) => !isHypothesisNode(child));
  }
  return children;
}

function subtreeWidth(node, mode) {
  const children = getRenderableTreeChildren(node, mode);
  if (children.length === 0) {
    return TREE_CARD_WIDTH;
  }
  const childrenWidth = children.map((child) => subtreeWidth(child, mode)).reduce((sum, value) => sum + value, 0);
  const gaps = TREE_CHILD_GAP * Math.max(children.length - 1, 0);
  return Math.max(TREE_CARD_WIDTH, childrenWidth + gaps);
}

function announceTreeInteraction(stage, message) {
  const live = stage?.querySelector(".acv2-tree-interaction-status");
  if (live) live.textContent = message;
}

function dispatchMoveRequest(element, causeId, parentId, source) {
  element.dispatchEvent(new CustomEvent("rca:cause-move-request", {
    bubbles: true,
    detail: { causeId, parentId, source },
  }));
}

function findRenderedCard(stage, nodeId) {
  return Array.from(stage?.querySelectorAll('[data-node-id]') || [])
    .find((card) => String(card.dataset.nodeId) === String(nodeId)) || null;
}

function renderTreeCard(node, selectedCauseId, hypothesesByCause, mode, payload, interaction = {}) {
  const isHypothesis = isHypothesisNode(node);
  if (isHypothesis) {
    const card = createElement("div", "acv2-tree-hypothesis-node");
    card.dataset.hypothesisId = String(node.id);
    card.append(
      createElement("div", "acv2-tree-card-kicker", "hipotesis"),
      createElement("div", "acv2-tree-hypothesis-title", node.nombre || node.descripcion || "Hipotesis sin descripcion"),
      createElement("div", "acv2-tree-hypothesis-meta", node.criterio_validacion || "Sin criterio de validacion"),
    );
    return card;
  }
  const causeId = Number(node.id);
  const childHypotheses = (node.children || []).filter(
    (child) => String(child.node_type || child.tipo || "").toUpperCase() === "HYPOTHESIS",
  );
  const hypotheses = hypothesesByCause[String(causeId)]?.length
    ? hypothesesByCause[String(causeId)]
    : childHypotheses;
  const isAnalysisMode = mode === "analisis_causas_v2";
  const state = isAnalysisMode && hypotheses.length
    ? readStatus(hypotheses[0].analysis_result?.evaluacion || hypotheses[0].estado)
    : "pending";
  const isActive = selectedCauseId !== null && Number(selectedCauseId) === causeId;
  const projectionMetadata = readProjectionMetadata(payload);
  const isReusedNode = projectionMetadata.reusedNodeIdSet.has(String(causeId));
  const movable = isTreeNodeMovable(node, payload);
  const card = createElement("button", `acv2-tree-node-button ${movable ? "acv2-tree-node-movable" : "acv2-tree-node-readonly"}`.trim());
  card.type = "button";
  card.setAttribute("role", "treeitem");
  card.dataset.nodeId = String(causeId);
  card.dataset.dragState = movable ? "idle" : "unavailable";
  card.draggable = movable;
  card.tabIndex = interaction.tabIndex ?? -1;
  card.setAttribute("aria-level", String(interaction.level || 1));
  card.setAttribute("aria-setsize", String(interaction.setSize || 1));
  card.setAttribute("aria-posinset", String(interaction.posInSet || 1));
  card.setAttribute("aria-label", `${node.nombre || "Causa sin nombre"}${movable ? ". Movible" : ""}`);
  if (interaction.hasChildren) card.setAttribute("aria-expanded", "true");
  const statusId = `acv2-tree-node-status-${causeId}`;
  card.setAttribute("aria-describedby", statusId);
  const wrap = createElement(
    "div",
    `acv2-tree-card ${isActive ? "acv2-tree-card-active" : ""} ${isAnalysisMode && state === "discarded" ? "acv2-tree-card-muted" : ""}`.trim(),
  );
  const bar = createElement("div", "acv2-node-topbar");
  bar.style.backgroundColor = isAnalysisMode ? STATUS_COLORS[state] : "#94a3b8";
  const body = createElement("div", "acv2-tree-card-surface");
  const head = createElement("div", "acv2-tree-card-head");
  const headLeft = createElement("div", "acv2-tree-card-head-left");
  const kicker = createElement("span", "acv2-tree-card-kicker", node.categoria || node.tipo || "causa");
  headLeft.appendChild(kicker);
  if (isReusedNode) {
    const badge = createElement("span", "acv2-tree-card-badge acv2-tree-card-badge-projected", "Nodo compartido");
    badge.title = "Nodo reutilizado o alcanzado a traves de una proyeccion automatica del DAG.";
    headLeft.appendChild(badge);
  }
  if (isAnalysisMode) head.appendChild(renderStatusChip(state, isActive));
  const title = createElement("h4", "acv2-tree-card-title", node.nombre || "Causa sin nombre");
  const description = createElement("div", "acv2-tree-card-desc", node.descripcion || "Sin descripcion");
  const dragHandle = createElement("span", "acv2-tree-drag-handle", movable ? "↕ Mover" : "");
  dragHandle.setAttribute("aria-hidden", "true");
  const status = createElement("span", "acv2-tree-interaction-hint", movable ? "Arrastra o pulsa Espacio para mover" : "No disponible para mover");
  status.id = statusId;
  body.append(head, title, description, renderHypothesisSummary(hypotheses, 2, isAnalysisMode), dragHandle, status);
  wrap.append(bar, body);
  card.appendChild(wrap);
  card.addEventListener("click", () => {
    const event = new CustomEvent("tree:select-node", { bubbles: true, detail: { nodeId: causeId, mode } });
    card.dispatchEvent(event);
  });
  card.addEventListener("keydown", (event) => interaction.onKeyDown?.(event, card, node));
  card.addEventListener("dragstart", (event) => interaction.onDragStart?.(event, card, node));
  card.addEventListener("dragover", (event) => interaction.onDragOver?.(event, card, node));
  card.addEventListener("dragleave", (event) => interaction.onDragLeave?.(event, card, node));
  card.addEventListener("drop", (event) => interaction.onDrop?.(event, card, node));
  card.addEventListener("dragend", (event) => interaction.onDragEnd?.(event, card, node));
  card.addEventListener("dragcancel", (event) => interaction.onDragEnd?.(event, card, node));
  return card;
}

function renderSubtree(node, selectedCauseId, hypothesesByCause, mode, payload, interaction, level = 1, posInSet = 1, setSize = 1) {
  const children = getRenderableTreeChildren(node, mode);
  const width = subtreeWidth(node, mode);
  const shell = createElement("div", `acv2-tree-node-shell ${node.parent_id === null ? "acv2-tree-node-shell-root" : ""}`.trim());
  shell.style.width = `${width}px`;
  shell.style.minWidth = `${width}px`;
  shell.style.maxWidth = `${width}px`;
  shell.style.flex = `0 0 ${width}px`;

  const cardShell = createElement("div", "acv2-tree-node-card-shell");
  const inner = createElement("div", "acv2-tree-node-card-shell-inner");
  inner.append(renderTreeCard(node, selectedCauseId, hypothesesByCause, mode, payload, {
    ...interaction,
    level,
    posInSet,
    setSize,
    hasChildren: children.length > 0,
    tabIndex: interaction.focusId === String(node.id) || (interaction.focusId === null && level === 1 && posInSet === 1) ? 0 : -1,
  }));
  if (children.length > 0) {
    inner.append(createElement("div", "acv2-tree-parent-drop"));
  }
  cardShell.appendChild(inner);
  shell.appendChild(cardShell);

  if (children.length > 0) {
    const childrenShell = createElement(
      "div",
      `acv2-tree-children ${children.length >= 2 ? "acv2-tree-children-multi" : "acv2-tree-children-single"}`.trim(),
    );
    childrenShell.style.width = `${width}px`;
    if (children.length >= 2) {
      const widths = children.map((child) => subtreeWidth(child, mode));
      const line = createElement("div", "acv2-tree-children-line");
      line.style.left = `${TREE_CARD_WIDTH / 2}px`;
      line.style.right = `${widths[widths.length - 1] - (TREE_CARD_WIDTH / 2)}px`;
      childrenShell.appendChild(line);
    }
    const body = createElement("div", "acv2-tree-children-body");
    body.setAttribute("role", "group");
    body.setAttribute("aria-label", `Hijas de ${node.nombre || "la causa"}`);
    body.style.width = `${width}px`;
    children.forEach((child) => {
      const childWidth = subtreeWidth(child, mode);
      const cell = createElement("div", "acv2-tree-child-cell");
      const childDrop = createElement("div", "acv2-tree-child-drop");
      cell.style.width = `${childWidth}px`;
      cell.style.minWidth = `${childWidth}px`;
      cell.style.maxWidth = `${childWidth}px`;
      cell.style.flex = `0 0 ${childWidth}px`;
      cell.style.setProperty("--acv2-tree-child-drop-offset", `${TREE_CARD_WIDTH / 2}px`);
      cell.append(childDrop, renderSubtree(child, selectedCauseId, hypothesesByCause, mode, payload, interaction, level + 1, children.indexOf(child) + 1, children.length));
      body.appendChild(cell);
    });
    childrenShell.appendChild(body);
    shell.appendChild(childrenShell);
  }

  return shell;
}

export function renderTreeCanvas(payload) {
  const stage = createElement("div", "acv2-tree-stage");
  stage.setAttribute("role", "tree");
  stage.setAttribute("aria-label", "Árbol causal");
  stage.tabIndex = -1;
  stage.appendChild(createElement("div", "acv2-canvas-scroll-cue", "Desplaza horizontalmente para explorar el árbol completo"));
  const live = createElement("div", "acv2-tree-interaction-status", "");
  live.id = "acv2-tree-live-status";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  stage.appendChild(live);
  const forest = createElement("div", "acv2-tree-forest");
  forest.style.transform = `scale(${payload.zoom || 1})`;
  forest.style.zoom = `${payload.zoom || 1}`;
  const roots = payload.tree || [];
  const focusId = payload.selected_cause_id === null || payload.selected_cause_id === undefined
    ? null
    : String(payload.selected_cause_id);
  let dragSourceId = null;
  let keyboardMoveSourceId = null;
  const allCards = () => Array.from(stage.querySelectorAll('[role="treeitem"]'));
  const focusNode = (id) => {
    const target = findRenderedCard(stage, id);
    if (!target) return;
    allCards().forEach((card) => { card.tabIndex = card === target ? 0 : -1; });
    target.focus();
  };
  const resetDropFeedback = () => {
    allCards().forEach((card) => {
      card.classList.remove("acv2-tree-drop-valid", "acv2-tree-drop-invalid", "acv2-tree-drop-active");
      card.dataset.dragState = isTreeNodeMovable(findNodeById(payload.tree, card.dataset.nodeId), payload) ? "idle" : "unavailable";
    });
  };
  const emitKeyboardMove = (sourceId, targetId) => {
    const source = findNodeById(payload.tree, sourceId);
    const target = findNodeById(payload.tree, targetId);
    if (!canDropTreeNode(source, target, payload)) {
      announceTreeInteraction(stage, "Destino no válido: no puedes mover una causa sobre sí misma ni sobre su subárbol.");
      return;
    }
    dispatchMoveRequest(stage, Number(sourceId), Number(targetId), "keyboard");
    announceTreeInteraction(stage, `Movimiento preparado: ${source.nombre || "causa"} bajo ${target.nombre || "causa"}.`);
    keyboardMoveSourceId = null;
  };
  const onKeyDown = (event, card, node) => {
    const cards = allCards();
    const index = cards.indexOf(card);
    const parentId = findParentId(payload.tree, node.id);
    let destination = null;
    if (event.key === "ArrowDown") destination = cards[index + 1];
    if (event.key === "ArrowUp") destination = cards[index - 1];
    if (event.key === "Home") destination = cards[0];
    if (event.key === "End") destination = cards[cards.length - 1];
    if (event.key === "ArrowRight") destination = card.getAttribute("aria-expanded") === "true"
      ? card.closest(".acv2-tree-node-shell")?.querySelector(".acv2-tree-children-body [role=\"treeitem\"]")
      : null;
    if (event.key === "ArrowLeft") destination = parentId === null || parentId === undefined ? null : findRenderedCard(stage, parentId);
    if (destination) {
      event.preventDefault();
      focusNode(destination.dataset.nodeId);
      return;
    }
    if (event.key === "Escape" && keyboardMoveSourceId !== null) {
      event.preventDefault();
      keyboardMoveSourceId = null;
      announceTreeInteraction(stage, "Movimiento cancelado.");
      resetDropFeedback();
      return;
    }
    if ((event.key === " " || event.key.toLowerCase() === "m") && keyboardMoveSourceId === null) {
      if (!isTreeNodeMovable(node, payload)) {
        announceTreeInteraction(stage, "Este nodo no tiene autoridad para moverse en esta vista.");
        return;
      }
      event.preventDefault();
      keyboardMoveSourceId = String(node.id);
      card.dataset.dragState = "keyboard-source";
      announceTreeInteraction(stage, "Movimiento iniciado. Usa las flechas para elegir un destino y pulsa Enter.");
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && keyboardMoveSourceId !== null) {
      event.preventDefault();
      emitKeyboardMove(keyboardMoveSourceId, node.id);
    }
  };
  const onDragStart = (event, card, node) => {
    if (!isTreeNodeMovable(node, payload)) {
      event.preventDefault();
      return;
    }
    dragSourceId = String(node.id);
    card.setAttribute("aria-grabbed", "true");
    card.dataset.dragState = "dragging";
    event.dataTransfer?.setData("text/plain", dragSourceId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    announceTreeInteraction(stage, `Moviendo ${node.nombre || "causa"}. Elige un destino válido.`);
  };
  const onDragOver = (event, card, node) => {
    if (dragSourceId === null) return;
    const source = findNodeById(payload.tree, dragSourceId);
    const valid = canDropTreeNode(source, node, payload);
    card.classList.toggle("acv2-tree-drop-valid", valid);
    card.classList.toggle("acv2-tree-drop-invalid", !valid);
    card.classList.add("acv2-tree-drop-active");
    card.dataset.dragState = valid ? "drop-target" : "drop-invalid";
    if (valid) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      announceTreeInteraction(stage, `↳ Soltar aquí para mover bajo ${node.nombre || "esta causa"}.`);
    } else {
      announceTreeInteraction(stage, `⛔ Destino no válido: ${node.nombre || "esta causa"}.`);
    }
  };
  const onDragLeave = (event, card) => {
    if (event.relatedTarget && card.contains(event.relatedTarget)) return;
    card.classList.remove("acv2-tree-drop-valid", "acv2-tree-drop-invalid", "acv2-tree-drop-active");
    card.dataset.dragState = card.classList.contains("acv2-tree-node-readonly") ? "unavailable" : "idle";
  };
  const onDrop = (event, card, node) => {
    event.preventDefault();
    const sourceId = dragSourceId || event.dataTransfer?.getData("text/plain");
    const source = findNodeById(payload.tree, sourceId);
    if (source && canDropTreeNode(source, node, payload)) {
      dispatchMoveRequest(stage, Number(source.id), Number(node.id), "drag");
      announceTreeInteraction(stage, `Movimiento preparado bajo ${node.nombre || "causa"}.`);
    } else {
      announceTreeInteraction(stage, "Destino no válido; el movimiento no se ha solicitado.");
    }
    resetDropFeedback();
  };
  const onDragEnd = () => {
    dragSourceId = null;
    resetDropFeedback();
    allCards().forEach((card) => card.removeAttribute("aria-grabbed"));
    announceTreeInteraction(stage, "");
  };
  const interaction = {
    focusId,
    onKeyDown,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
  };
  roots.forEach((root, index) => {
    forest.appendChild(renderSubtree(root, payload.selected_cause_id, payload.hypotheses_by_cause || {}, payload.view, payload, interaction, 1, index + 1, roots.length));
  });
  stage.appendChild(forest);
  return stage;
}

function renderHypothesisCard(hypothesis, handlers = {}) {
  const state = readStatus(hypothesis.analysis_result?.evaluacion || hypothesis.estado);
  const card = createElement("div", "acv2-hypothesis-card");
  const head = createElement("div", "acv2-hypothesis-head");
  const left = createElement("div");
  left.style.minWidth = "0";
  const title = createElement("div", "acv2-hypothesis-title", hypothesis.nombre || hypothesis.name || hypothesis.descripcion || "Hipotesis sin titulo");
  left.append(title);
  if (handlers.analysisMode) head.append(left, renderStatusChip(state));
  else head.append(left);
  const description = createElement("div", "acv2-hypothesis-note", hypothesis.descripcion || "Sin descripcion");
  const definition = createElement("div", "acv2-hypothesis-definition");
  definition.append(
    createElement("div", "acv2-hypothesis-definition-item", `Criterio de validación: ${hypothesis.criterio_validacion || "Sin criterio de validación."}`),
    createElement("div", "acv2-hypothesis-definition-item", `Método de cálculo: ${hypothesis.metodo || hypothesis.method || "Sin método de cálculo."}`),
  );
  card.append(head, description, definition);
  if (handlers.analysisMode) {
    const evidence = document.createElement("textarea");
    evidence.className = "acv2-analysis-hypothesis-evidence";
    evidence.id = `analysis-hypothesis-${hypothesis.id}-evidence`;
    evidence.rows = 3;
    evidence.placeholder = "Evidencia obligatoria para aceptar o rechazar esta hipotesis";
    evidence.value = hypothesis.analysis_result?.evidencia || "";
    const criterion = document.createElement("textarea");
    criterion.className = "acv2-analysis-hypothesis-criterion";
    criterion.id = `analysis-hypothesis-${hypothesis.id}-criterion`;
    criterion.rows = 2;
    criterion.placeholder = "Criterio que confirma o rechaza esta hipótesis";
    criterion.value = hypothesis.analysis_result?.criterio_validacion || hypothesis.criterio_validacion || "";
    const comment = document.createElement("textarea");
    comment.className = "acv2-analysis-hypothesis-comment";
    comment.id = `analysis-hypothesis-${hypothesis.id}-decision-justification`;
    comment.rows = 2;
    comment.placeholder = "Justificación de decisión (obligatoria para NO OK)";
    comment.value = hypothesis.analysis_result?.decision_justification
      || hypothesis.analysis_result?.justificacion_decision
      || hypothesis.analysis_result?.conclusion
      || "";
    const fieldLabel = (forId, text) => {
      const label = createElement("label", "acv2-analysis-hypothesis-label", text);
      label.htmlFor = forId;
      return label;
    };
    const errorNode = createElement("div", "acv2-analysis-hypothesis-error", "La evidencia es obligatoria.");
    errorNode.hidden = true;
    const actions = createElement("div", "acv2-hypothesis-actions");
    const accept = createElement("button", "acv2-hypothesis-btn acv2-hypothesis-btn-inactive", "OK");
    const reject = createElement("button", "acv2-hypothesis-btn acv2-hypothesis-btn-danger", "NO OK");
    [accept, reject].forEach((button) => {
      button.type = "button";
      button.dataset.hypothesisAction = "evaluate";
      button.dataset.hypothesisId = String(hypothesis.id);
    });
    const readOnly = Boolean(handlers.readOnly);
    evidence.disabled = readOnly;
    criterion.disabled = readOnly;
    comment.disabled = readOnly;
    if (!readOnly) {
      accept.addEventListener("click", () => handlers.onEvaluateHypothesis?.(hypothesis, "confirmada", evidence.value, criterion.value, comment.value, errorNode));
      reject.addEventListener("click", () => handlers.onEvaluateHypothesis?.(hypothesis, "descartada", evidence.value, criterion.value, comment.value, errorNode));
      actions.append(accept, reject);
    }
    card.append(
      fieldLabel(evidence.id, "Evidencia"), evidence,
      fieldLabel(criterion.id, "Criterio de validación"), criterion,
      fieldLabel(comment.id, "Justificación de decisión"), comment,
      errorNode, actions,
    );
  }
  return card;
}

export function renderDetailPanel(payload, handlers = {}) {
  const panel = createElement("div", "acv2-detail-body");
  const cause = payload.detail?.cause;
  if (!cause) {
    panel.appendChild(createElement("div", "acv2-empty-state", "Selecciona una causa para ver el detalle."));
    return panel;
  }
  const hypotheses = payload.detail?.hypotheses || [];
  const isAnalysisMode = payload.view === "analisis_causas_v2";
  const nodeState = isAnalysisMode && hypotheses.length
    ? readStatus(hypotheses[0].analysis_result?.evaluacion || hypotheses[0].estado)
    : "pending";
  const header = createElement("div");
  header.className = "d-flex justify-content-between align-items-start gap-3";
  header.append(createElement("div", "acv2-detail-title", "Detalle del nodo"));
  if (payload.detail?.context_message) {
    const contextMessage = createElement("div", "acv2-empty-state", payload.detail.context_message);
    contextMessage.style.padding = "0.7rem 0.8rem";
    panel.appendChild(contextMessage);
  }
  const contextItems = (Array.isArray(payload.detail?.context_items) ? payload.detail.context_items : [])
    .filter((item) => !/[#]|\b(id|uuid|mode|parent|metadata)\b/i.test(`${item.label || ""} ${item.value || ""}`));
  if (contextItems.length > 0) {
    const contextBox = createElement("div", "acv2-detail-metadata");
    contextItems.forEach((item) => {
      const row = createElement("div", "acv2-detail-meta-row");
      row.append(createElement("span", "acv2-detail-meta-label", item.label), createElement("span", "", item.value));
      contextBox.appendChild(row);
    });
    panel.appendChild(contextBox);
  }
  const summary = createElement("div");
  const title = createElement("div");
  title.style.fontSize = "1.35rem";
  title.style.fontWeight = "700";
  title.style.letterSpacing = "-0.03em";
  title.textContent = cause.nombre || "Causa sin nombre";
  const description = createElement("div");
  description.style.color = "#4b5563";
  description.style.marginTop = "0.3rem";
  description.style.lineHeight = "1.45";
  description.textContent = cause.descripcion || "Sin descripcion";
  summary.append(title, description);
  const metadata = createElement("div", "acv2-detail-metadata");
  const displayContext = payload.display_context || {};
  const rows = [
    ["Categoria", cause.categoria || cause.tipo || "causa"],
    ["Responsable", cause.responsable || "No registrado"],
    ...(displayContext.processName ? [["Proceso", displayContext.processName]] : []),
    ...(displayContext.objective ? [["Objetivo", displayContext.objective]] : []),
  ];
  rows.forEach(([label, value]) => {
    const row = createElement("div", "acv2-detail-meta-row");
    row.append(createElement("span", "acv2-detail-meta-label", label), createElement("span", "", value));
    metadata.appendChild(row);
  });
  if (isAnalysisMode) header.appendChild(renderStatusChip(nodeState));
  const analysisReadOnly = isAnalysisMode && payload.analysis?.estado === "cerrado";
  const actionsTitle = createElement("div");
  actionsTitle.className = "acv2-detail-title";
  actionsTitle.style.fontSize = "0.98rem";
  actionsTitle.textContent = isAnalysisMode ? "Evaluacion" : "Acciones";
  const actions = createElement("div", "d-flex flex-wrap gap-2");
  if (!isAnalysisMode) {
    const editBtn = createElement("button", "acv2-hypothesis-btn acv2-hypothesis-btn-inactive", "Abrir detalle");
    const childBtn = createElement("button", "acv2-hypothesis-btn acv2-hypothesis-btn-inactive", "+ Hija");
    const deleteBtn = createElement("button", "acv2-hypothesis-btn acv2-hypothesis-btn-danger", "Eliminar");
    [editBtn, childBtn, deleteBtn].forEach((button, index) => {
      button.type = "button";
      button.dataset.treeAction = ["open-detail", "new-child", "delete-cause"][index];
    });
    editBtn.addEventListener("click", () => handlers.onOpenDetail?.(cause));
    childBtn.addEventListener("click", () => handlers.onNewChild?.(cause));
    deleteBtn.addEventListener("click", () => handlers.onDelete?.(cause));
    actions.append(editBtn, childBtn, deleteBtn);
  } else {
    actions.appendChild(createElement("div", "acv2-empty-state", "Selecciona una hipótesis para registrar su evaluación y evidencia.",));
  }
  const hypTitle = createElement("div");
  hypTitle.className = "acv2-detail-title";
  hypTitle.style.fontSize = "0.98rem";
  hypTitle.textContent = "Hipotesis";
  const hypList = createElement("div", "acv2-hypothesis-list");
  if (hypotheses.length === 0) {
    hypList.appendChild(createElement("div", "acv2-empty-state", "Este nodo todavia no tiene hipotesis."));
  } else {
    hypotheses.forEach((hypothesis) => hypList.appendChild(renderHypothesisCard(hypothesis, {
      analysisMode: isAnalysisMode,
      readOnly: analysisReadOnly,
      onEvaluateHypothesis: handlers.onEvaluateHypothesis,
    })));
  }
  panel.append(header, summary, metadata, actionsTitle, actions, hypTitle, hypList);
  return panel;
}

export function renderSidebar(payload) {
  const sidebar = createElement("div", "acv2-sidebar");
  const displayContext = payload.display_context || {};
  const title = createElement("div", "acv2-sidebar-title", displayContext.processName || "Arbol causal");
  const subtitle = createElement("div", "acv2-sidebar-subtitle", displayContext.objective || "Vista de arbol");
  const contractLabel = createElement("div");
  contractLabel.className = "text-uppercase";
  contractLabel.style.fontSize = "0.68rem";
  contractLabel.style.letterSpacing = "0.16em";
  contractLabel.style.fontWeight = "700";
  contractLabel.style.color = "#64748b";
  contractLabel.style.marginBottom = "0.35rem";
  contractLabel.textContent = "Alcance del contrato";
  const contractSelect = createElement("select", "");
  const contractOptions = Array.isArray(payload.contract_options) ? payload.contract_options : [];
  if (contractOptions.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "no hay contratos";
    option.selected = true;
    contractSelect.appendChild(option);
    contractSelect.disabled = true;
  } else {
    contractOptions.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = readableTreeContractLabel(item);
      option.selected = String(item.id) === String(payload.contract?.id || "");
      contractSelect.appendChild(option);
    });
  }
  if (payload.view === "analisis_causas_v2") {
    contractSelect.disabled = true;
  }
  contractSelect.style.width = "100%";
  contractSelect.style.padding = "0.72rem 0.78rem";
  contractSelect.style.border = "1px solid #cbd5e1";
  contractSelect.style.borderRadius = "0.25rem";
  contractSelect.style.background = "#ffffff";
  const nav = createElement("nav", "acv2-nav");
  (payload.sidebar?.nav || []).forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href || "#";
    link.className = `acv2-nav-item ${item.active ? "acv2-nav-item-active" : "acv2-nav-item-inactive"}`.trim();
    link.append(createElement("span", "material-symbols-outlined acv2-nav-icon", item.icon), createElement("span", "", item.label));
    nav.appendChild(link);
  });
  const footer = createElement("div", "acv2-sidebar-footer");
  const action = createElement("button", "acv2-sidebar-primary");
  action.type = "button";
  action.disabled = false;
  action.textContent = translateTreeLabel(payload.sidebar?.action_label, "Crear causa raiz");
  footer.appendChild(action);
  sidebar.append(title, subtitle, contractLabel, contractSelect, nav, footer);
  return sidebar;
}

function renderTopContext(payload) {
  const context = createElement("div", "acv2-context-stack");
  const displayContext = payload.display_context || {};
  const title = createElement("div", "acv2-context-title", displayContext.objective || displayContext.contractLabel || "Arbol causal");
  const subtitle = createElement("div", "acv2-context-subtitle", displayContext.objective ? "Objetivo del contrato" : "");
  context.append(title, subtitle);
  const projectionSummary = buildProjectionSummary(payload);
  if (projectionSummary) {
    const badge = createElement(
      "div",
      `acv2-projection-banner acv2-projection-banner-${projectionSummary.tone}`.trim(),
    );
    const badgeLabel = createElement("div", "acv2-projection-banner-label", translateTreeLabel(projectionSummary.label, projectionSummary.label));
    const badgeText = createElement(
      "div",
      "acv2-projection-banner-text",
      translateTreeLabel(projectionSummary.description, projectionSummary.description),
    );
    badge.append(badgeLabel, badgeText);
    context.appendChild(badge);
  }
  return context;
}

export function renderMain(payload) {
  const main = createElement("div", "acv2-main");
  const header = createElement("div", "acv2-main-header");
  const left = createElement("div");
  left.append(renderTopContext(payload));
  const right = createElement("div");
  right.style.textAlign = "right";
  right.append(createElement("span", "acv2-context-overline", `ZOOM ${Number(payload.zoom || 1).toFixed(2)}x`));
  header.append(left, right);
  const treeSlot = createElement("div", "acv2-canvas-shell");
  treeSlot.setAttribute("role", "region");
  treeSlot.setAttribute("aria-label", "Lienzo del árbol causal; desplázate horizontalmente para ver el contenido completo");
  treeSlot.tabIndex = 0;
  treeSlot.appendChild(createElement("div", "acv2-canvas-scroll-cue", "Desplaza horizontalmente para explorar el árbol completo"));
  treeSlot.appendChild(createElement("div", "acv2-empty-state", "Cargando arbol..."));
  const toolbar = createElement("div", "acv2-tree-toolbar");
  const zoomGrid = createElement("div", "acv2-zoom-grid");
  ["zoom_in", "zoom_out", "fit_screen"].forEach((label) => {
    const btn = createElement("button", "acv2-zoom-btn");
    btn.type = "button";
    const icon = createElement("span", "material-symbols-outlined", label);
    icon.style.fontSize = "1rem";
    btn.appendChild(icon);
    btn.disabled = false;
    zoomGrid.appendChild(btn);
  });
  const legend = createElement("div", "acv2-floating-card acv2-legend");
  const legendTitle = createElement("div", "acv2-legend-title", "Leyenda de estados");
  legend.appendChild(legendTitle);
  (payload.legend || []).forEach((entry) => {
    const row = createElement("div", "acv2-legend-row");
    const dot = createElement("span", "acv2-dot");
    dot.style.backgroundColor = entry.color;
    row.append(dot, createElement("span", "", translateTreeLabel(entry.label, entry.label)));
    legend.appendChild(row);
  });
  toolbar.appendChild(zoomGrid);
  if (payload.view === "analisis_causas_v2") toolbar.appendChild(legend);
  main.append(header, treeSlot, toolbar);
  return main;
}
