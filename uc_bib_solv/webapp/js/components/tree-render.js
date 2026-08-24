import { readStatus, readableTreeContractLabel } from "./tree-data.js";

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

function renderHypothesisSummary(hypotheses, limit = 2) {
  const summary = createElement("div", "acv2-tree-hypothesis-list");
  const slice = (hypotheses || []).slice(0, limit);
  if (slice.length === 0) {
    const empty = createElement("div", "acv2-empty-state", "Sin hipotesis");
    empty.style.padding = "0.5rem 0.6rem";
    summary.appendChild(empty);
    return summary;
  }
  slice.forEach((hypothesis) => {
    const state = readStatus(hypothesis.analysis_result?.evaluacion || hypothesis.estado);
    const item = createElement("div", "acv2-tree-hypothesis-item");
    if (hypothesis.id !== undefined && hypothesis.id !== null) {
      item.dataset.hypothesisId = String(hypothesis.id);
    }
    const main = createElement("div", "acv2-tree-hypothesis-main");
    const title = createElement("div", "acv2-tree-hypothesis-title", hypothesis.descripcion || "Hipotesis sin descripcion");
    main.append(title);
    item.append(main, renderStatusChip(state));
    summary.appendChild(item);
  });
  if ((hypotheses || []).length > limit) {
    const more = createElement("div", "acv2-tree-hypothesis-meta", `+${hypotheses.length - limit} hipotesis mas`);
    summary.appendChild(more);
  }
  return summary;
}

function subtreeWidth(node) {
  const children = node.children || [];
  if (children.length === 0) {
    return TREE_CARD_WIDTH;
  }
  const childrenWidth = children.map((child) => subtreeWidth(child)).reduce((sum, value) => sum + value, 0);
  const gaps = TREE_CHILD_GAP * Math.max(children.length - 1, 0);
  return Math.max(TREE_CARD_WIDTH, childrenWidth + gaps);
}

function renderTreeCard(node, selectedCauseId, hypothesesByCause, mode, payload) {
  const causeId = Number(node.id);
  const hypotheses = hypothesesByCause[String(causeId)] || [];
  const state = hypotheses.length ? readStatus(hypotheses[0].analysis_result?.evaluacion || hypotheses[0].estado) : "pending";
  const isActive = selectedCauseId !== null && Number(selectedCauseId) === causeId;
  const projectionMetadata = readProjectionMetadata(payload);
  const isReusedNode = projectionMetadata.reusedNodeIdSet.has(String(causeId));
  const card = createElement("button", "acv2-tree-node-button");
  card.type = "button";
  card.dataset.nodeId = String(causeId);
  const wrap = createElement(
    "div",
    `acv2-tree-card ${isActive ? "acv2-tree-card-active" : ""} ${state === "discarded" ? "acv2-tree-card-muted" : ""}`.trim(),
  );
  const bar = createElement("div", "acv2-node-topbar");
  bar.style.backgroundColor = STATUS_COLORS[state];
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
  head.append(headLeft, renderStatusChip(state, isActive));
  const title = createElement("h4", "acv2-tree-card-title", node.nombre || "Causa sin nombre");
  const description = createElement("div", "acv2-tree-card-desc", node.descripcion || "Sin descripcion");
  body.append(head, title, description, renderHypothesisSummary(hypotheses));
  wrap.append(bar, body);
  card.appendChild(wrap);
  card.addEventListener("click", () => {
    const event = new CustomEvent("tree:select-node", { bubbles: true, detail: { nodeId: causeId, mode } });
    card.dispatchEvent(event);
  });
  return card;
}

function renderSubtree(node, selectedCauseId, hypothesesByCause, mode, payload) {
  const children = node.children || [];
  const width = subtreeWidth(node);
  const shell = createElement("div", `acv2-tree-node-shell ${node.parent_id === null ? "acv2-tree-node-shell-root" : ""}`.trim());
  shell.style.width = `${width}px`;
  shell.style.minWidth = `${width}px`;
  shell.style.maxWidth = `${width}px`;
  shell.style.flex = `0 0 ${width}px`;

  const cardShell = createElement("div", "acv2-tree-node-card-shell");
  const inner = createElement("div", "acv2-tree-node-card-shell-inner");
  inner.append(renderTreeCard(node, selectedCauseId, hypothesesByCause, mode, payload));
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
      const widths = children.map((child) => subtreeWidth(child));
      const line = createElement("div", "acv2-tree-children-line");
      line.style.left = `${TREE_CARD_WIDTH / 2}px`;
      line.style.right = `${widths[widths.length - 1] - (TREE_CARD_WIDTH / 2)}px`;
      childrenShell.appendChild(line);
    }
    const body = createElement("div", "acv2-tree-children-body");
    body.style.width = `${width}px`;
    children.forEach((child) => {
      const childWidth = subtreeWidth(child);
      const cell = createElement("div", "acv2-tree-child-cell");
      const childDrop = createElement("div", "acv2-tree-child-drop");
      cell.style.width = `${childWidth}px`;
      cell.style.minWidth = `${childWidth}px`;
      cell.style.maxWidth = `${childWidth}px`;
      cell.style.flex = `0 0 ${childWidth}px`;
      cell.style.setProperty("--acv2-tree-child-drop-offset", `${TREE_CARD_WIDTH / 2}px`);
      cell.append(childDrop, renderSubtree(child, selectedCauseId, hypothesesByCause, mode, payload));
      body.appendChild(cell);
    });
    childrenShell.appendChild(body);
    shell.appendChild(childrenShell);
  }

  return shell;
}

export function renderTreeCanvas(payload) {
  const stage = createElement("div", "acv2-tree-stage");
  const forest = createElement("div", "acv2-tree-forest");
  forest.style.transform = `scale(${payload.zoom || 1})`;
  forest.style.zoom = `${payload.zoom || 1}`;
  (payload.tree || []).forEach((root) => {
    forest.appendChild(renderSubtree(root, payload.selected_cause_id, payload.hypotheses_by_cause || {}, payload.view, payload));
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
  const title = createElement("div", "acv2-hypothesis-title", hypothesis.descripcion || "Hipotesis sin descripcion");
  left.append(title);
  head.append(left, renderStatusChip(state));
  const note = createElement("div", "acv2-hypothesis-note", hypothesis.criterio_validacion || "Sin nota");
  card.append(head, note);
  if (handlers.analysisMode) {
    const evidence = document.createElement("textarea");
    evidence.className = "acv2-analysis-hypothesis-evidence";
    evidence.rows = 3;
    evidence.placeholder = "Evidencia obligatoria para aceptar o rechazar esta hipotesis";
    evidence.value = hypothesis.analysis_result?.evidencia || "";
    const errorNode = createElement("div", "acv2-analysis-hypothesis-error", "La evidencia es obligatoria.");
    errorNode.hidden = true;
    const actions = createElement("div", "acv2-hypothesis-actions");
    const accept = createElement("button", "acv2-hypothesis-btn acv2-hypothesis-btn-inactive", "Aceptar");
    const reject = createElement("button", "acv2-hypothesis-btn acv2-hypothesis-btn-danger", "Rechazar");
    [accept, reject].forEach((button) => {
      button.type = "button";
      button.dataset.hypothesisAction = "evaluate";
      button.dataset.hypothesisId = String(hypothesis.id);
    });
    accept.addEventListener("click", () => handlers.onEvaluateHypothesis?.(hypothesis, "confirmada", evidence.value, errorNode));
    reject.addEventListener("click", () => handlers.onEvaluateHypothesis?.(hypothesis, "descartada", evidence.value, errorNode));
    actions.append(accept, reject);
    card.append(evidence, errorNode, actions);
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
  const nodeState = hypotheses.length
    ? readStatus(hypotheses[0].analysis_result?.evaluacion || hypotheses[0].estado)
    : "pending";
  const header = createElement("div");
  header.className = "d-flex justify-content-between align-items-start gap-3";
  header.append(createElement("div", "acv2-detail-title", "Detalle del nodo"), renderStatusChip(nodeState));
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
  const isAnalysisMode = payload.view === "analisis_causas_v2";
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
    actions.appendChild(createElement("div", "acv2-empty-state", "Los metadatos de la plantilla son solo lectura. Usa el panel de trazabilidad para validar o rechazar.",));
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
    option.value = String(payload.contract?.id || "");
    option.textContent = displayContext.contractLabel || "Contrato seleccionado";
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
  toolbar.append(zoomGrid, legend);
  main.append(header, treeSlot, toolbar);
  return main;
}
