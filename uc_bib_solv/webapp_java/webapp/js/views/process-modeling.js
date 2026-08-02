import { createProcess, createVersion, createNode, updateNode, deleteNode, updateNodeMetadata, getStructuredContext, createTransition, getProcess, getVersion, listProcesses, validateVersion } from "../api/process-modeling.js";
import { renderGraph } from "../components/process-modeling/graph.js";
import { createProcessModelingState } from "../core/process-modeling-state.js";

const state = createProcessModelingState();
const flowScrollPosition = { left: 0, top: 0 };
let relayoutFrame = 0;
const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function shell() {
  return `<main class="pm-page"><div class="pm-header"><div class="pm-header-title"><a class="pm-home-link" href="#/inicio">← Menú inicial</a><p class="pm-eyebrow">Diseño industrial</p><h1>Modelado de procesos</h1><p class="pm-subtitle">Define versiones, nodos y transiciones con trazabilidad.</p></div><div class="pm-header-actions"><div class="pm-process-selector"><label for="pm-process-selector">Proceso seleccionado</label><select id="pm-process-selector" aria-describedby="pm-process-selector-help"><option value="">Selecciona un proceso</option></select><span id="pm-process-selector-help" class="pm-help-text">La selección conserva la versión y el contexto del editor.</span></div><button class="pm-primary" type="button" data-pm-action="focus-process-form">Nuevo proceso</button></div></div><form id="pm-process-form" class="pm-form pm-process-form"><div><label for="pm-process-code">Código</label><input id="pm-process-code" name="process_code" required autocomplete="off" placeholder="PROC-001"></div><div><label for="pm-process-name">Nombre</label><input id="pm-process-name" name="name" required autocomplete="off" placeholder="Proceso de fabricación"></div><button class="pm-primary" type="submit" data-pm-action="create-process">Crear proceso</button></form><div id="pm-message" class="pm-message" role="status" aria-live="polite"></div><div class="pm-layout"><aside class="pm-node-palette" aria-label="Opciones del flujo"><p class="pm-eyebrow">Opciones del flujo</p><p id="pm-palette-help" class="pm-palette-help">Selecciona un elemento del diagrama.</p><div class="pm-palette-items"><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="subprocess"><span class="pm-palette-symbol pm-palette-symbol-process">▱</span><span>Proceso</span></button><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="operation"><span class="pm-palette-symbol pm-palette-symbol-operation">□</span><span>Operación</span></button><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="output"><span class="pm-palette-symbol pm-palette-symbol-output">○</span><span>Salida</span></button><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="stock"><span class="pm-palette-symbol pm-palette-symbol-stock">▤</span><span>Stock</span></button><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="decision"><span class="pm-palette-symbol pm-palette-symbol-decision">◇</span><span>Decisión</span></button></div><div class="pm-palette-actions" aria-label="Editar o eliminar elemento seleccionado"><button type="button" class="pm-palette-action" data-pm-action="edit-selected-node" disabled>Editar</button><button type="button" class="pm-palette-action pm-palette-action-danger" data-pm-action="delete-selected-node" disabled>Eliminar</button></div></aside><section class="pm-panel pm-editor"><div id="pm-fullscreen-root" class="pm-fullscreen-root"><div id="pm-editor"><div class="pm-loading">Cargando modelado…</div></div></div></section></div><div id="pm-node-modal" class="pm-modal-overlay" hidden><div class="pm-node-modal" role="dialog" aria-modal="true" aria-labelledby="pm-node-modal-title"><div class="pm-node-modal-head"><div><p class="pm-eyebrow">Elemento del flujo</p><h2 id="pm-node-modal-title">Añadir al flujo</h2><p id="pm-node-modal-context" class="pm-help-text"></p></div><button type="button" class="pm-modal-close" data-pm-action="close-palette-modal" aria-label="Cerrar">×</button></div><form id="pm-palette-node-form" class="pm-palette-form"><input type="hidden" name="node_type"><div><label for="pm-palette-code">Código</label><input id="pm-palette-code" name="node_code" required readonly aria-describedby="pm-palette-code-help"><span id="pm-palette-code-help" class="pm-help-text">Se asigna automáticamente y no se repite.</span></div><div><label for="pm-palette-name">Nombre</label><input id="pm-palette-name" name="name" required autocomplete="off" placeholder="Nombre del elemento"></div><div><label for="pm-palette-description">Descripción</label><textarea id="pm-palette-description" name="description" rows="2" placeholder="Información opcional"></textarea></div><div class="pm-palette-stock-fields" hidden><label for="pm-palette-stock-capacity">Capacidad</label><input id="pm-palette-stock-capacity" name="stock_capacity" type="number" min="1" value="24"><label for="pm-palette-stock-quantity">Cantidad inicial</label><input id="pm-palette-stock-quantity" name="stock_initial_quantity" type="number" min="0" value="0"><label for="pm-palette-stock-unit">Unidad</label><input id="pm-palette-stock-unit" name="stock_unit" value="unidades"></div><div class="pm-palette-child-fields" hidden><label for="pm-palette-child-process">Proceso hijo</label><select id="pm-palette-child-process" name="child_process_id"><option value="">Selecciona un proceso hijo</option>${processOptions()}</select></div><div class="pm-palette-branch-fields" hidden><label for="pm-palette-branch-label">Salida desde la decisión</label><select id="pm-palette-branch-label" name="label" required><option value="">Selecciona Sí o No</option><option value="Sí">Sí</option><option value="No">No</option></select><span class="pm-help-text">Indica qué rama de la decisión representa esta salida.</span></div><div class="pm-node-modal-actions"><button type="button" class="pm-secondary" data-pm-action="close-palette-modal">Cancelar</button><button type="submit" class="pm-primary" data-pm-action="create-palette-node">Guardar elemento</button></div></form></div></div></main>`;
}

function metadataPanelShell() {
  return '<aside id="pm-metadata-panel" class="pm-metadata-panel" aria-label="Metadatos del elemento seleccionado"><div id="pm-metadata-content"><div class="pm-metadata-empty"><p class="pm-eyebrow">Contexto del elemento</p><h2>Sin selección</h2><p>Selecciona una tarjeta del flujo para consultar su descripción industrial.</p></div></div></aside>';
}

function message(text, error = false) {
  const el = document.getElementById("pm-message");
  if (el) {
    el.textContent = text;
    el.className = `pm-message ${error ? "is-error" : "is-saved"}`;
  }
}

function versionId() {
  return state.version?.version?.version_id || state.version?.version_id;
}

function processId() {
  return state.selectedProcess?.process_id || state.selectedProcess?.id;
}

function writeModelingHash(versionIdValue, nodeIdValue = "") {
  const params = new URLSearchParams({ version_id: versionIdValue });
  const path = Array.isArray(nodeIdValue) ? nodeIdValue : (nodeIdValue ? [nodeIdValue] : []);
  if (path.length) {
    params.set("node_id", path[path.length - 1]);
    params.set("expansion_path", path.join(","));
  }
  window.history.replaceState({}, "", `#/modelado-procesos?${params.toString()}`);
}

function hashContext() {
  const hash = window.location.hash.replace(/^#\/[^?]+\??/, "");
  return new URLSearchParams(hash);
}

function processOptions() {
  return state.processes.map((item) => `<option value="${esc(item.process_id)}">${esc(item.process_code)} — ${esc(item.name)}</option>`).join("");
}

function syncProcessSelector() {
  const selector = document.getElementById("pm-process-selector");
  if (!selector) return;
  selector.innerHTML = `<option value="">Selecciona un proceso</option>${processOptions()}`;
  selector.value = processId() || "";
}

function fullscreenButton() {
  return `<button class="pm-secondary" type="button" data-pm-action="toggle-fullscreen" aria-expanded="${state.fullscreen ? "true" : "false"}" aria-controls="pm-flow-zone">${state.fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}</button>`;
}

function zoomControls() {
  return `<div class="pm-zoom-controls" aria-label="Controles de escala del diagrama"><button class="pm-secondary" type="button" data-pm-action="zoom-out" aria-label="Reducir zoom">−</button><span aria-live="polite">${Math.round(state.zoom * 100)}%</span><button class="pm-secondary" type="button" data-pm-action="zoom-in" aria-label="Aumentar zoom">+</button><button class="pm-secondary" type="button" data-pm-action="zoom-fit">Ajustar</button></div>`;
}

function parentNavigationControl() {
  if (!state.expansionStack.length && !state.openedFromParent) return "";
  return '<button class="pm-secondary" type="button" data-pm-action="collapse-subprocess">Volver al padre</button>';
}

function nodeOptions(nodes) {
  return nodes.map((node) => `<option value="${esc(node.node_id)}">${esc(node.node_code)} — ${esc(node.name)}</option>`).join("");
}

function syncNodeFields() {
  const type = document.getElementById("pm-node-type")?.value;
  const output = document.getElementById("pm-node-output-role")?.parentElement;
  const stock = ["pm-node-stock-capacity", "pm-node-stock-quantity", "pm-node-stock-unit"]
    .map((id) => document.getElementById(id)?.parentElement);
  if (output) output.hidden = type !== "output";
  stock.forEach((field) => { if (field) field.hidden = type !== "stock"; });
}

function createVersionForm() {
  return `<div class="pm-empty-state"><h2>${esc(state.selectedProcess?.name || "Proceso")}</h2><p>Este proceso todavía no tiene una versión editable.</p><button class="pm-primary" type="button" data-pm-action="create-version">Crear versión draft</button></div>`;
}

function renderEditorHtml(target, html) {
  const currentFlow = target.querySelector(".pm-flow-scroll");
  if (currentFlow) {
    flowScrollPosition.left = currentFlow.scrollLeft;
    flowScrollPosition.top = currentFlow.scrollTop;
  }
  target.innerHTML = html;
  const nextFlow = target.querySelector(".pm-flow-scroll");
  if (nextFlow) {
    nextFlow.scrollLeft = flowScrollPosition.left;
    nextFlow.scrollTop = flowScrollPosition.top;
  }
  updateFullscreenDom();
  updateNodeSelection();
}

function updateNodeSelection() {
  document.querySelectorAll(".pm-bpm-card[data-node-id]").forEach((card) => {
    const selected = String(card.dataset.nodeId) === String(state.selectedNodeId);
    card.classList.toggle("is-pm-selected", selected);
    card.setAttribute("aria-selected", selected ? "true" : "false");
  });
  const help = document.getElementById("pm-palette-help");
  if (help) help.textContent = state.selectedNodeId ? "Elemento seleccionado. Elige un símbolo para añadirlo después." : "Selecciona un elemento del diagrama.";
  ["edit-selected-node", "delete-selected-node"].forEach((actionName) => {
    const control = document.querySelector(`[data-pm-action="${actionName}"]`);
    if (control) control.disabled = !state.selectedNodeId;
  });
}

function selectNode(nodeId) {
  state.selectedNodeId = nodeId || "";
  state.selectedNodeContextRecords = [];
  updateNodeSelection();
  renderMetadataPanel();
  if (state.selectedNodeId && versionId()) void loadNodeContextRecords(state.selectedNodeId, versionId());
}

function metadataText(value) {
  if (Array.isArray(value)) return value.length ? `<ul>${value.map((item) => `<li>${esc(typeof item === "string" ? item : JSON.stringify(item))}</li>`).join("")}</ul>` : '<p class="pm-metadata-muted">Sin información</p>';
  if (value && typeof value === "object") return `<pre>${esc(JSON.stringify(value, null, 2))}</pre>`;
  return value !== undefined && value !== null && value !== "" ? `<p>${esc(value)}</p>` : '<p class="pm-metadata-muted">Sin información</p>';
}

const metadataAliases = {
  description: ["description", "operation_description", "detailed_description"],
  summary: ["summary"],
  objective: ["objective", "purpose", "mission"],
  controls: ["controls", "quality_controls"],
  contracts: ["contracts", "declarative_contract"],
  assignments: ["assignments", "operation_machine_assignments"],
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameJson(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch (_error) {
    return left === right;
  }
}

function mergeMetadataValue(existing, incoming) {
  if (existing === undefined) return incoming;
  if (incoming === undefined || sameJson(existing, incoming)) return existing;
  if (isRecord(existing) && isRecord(incoming)) {
    return Object.keys(incoming).reduce((merged, key) => {
      merged[key] = mergeMetadataValue(merged[key], incoming[key]);
      return merged;
    }, { ...existing });
  }
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return [...existing, ...incoming.filter((item) => !existing.some((known) => sameJson(known, item)))];
  }
  if (Array.isArray(existing)) return existing.some((item) => sameJson(item, incoming)) ? existing : [...existing, incoming];
  if (Array.isArray(incoming)) return [existing, ...incoming.filter((item) => !sameJson(existing, item))];
  return [existing, incoming];
}

function addMetadataSource(target, source) {
  if (!isRecord(source)) return target;
  Object.keys(source).forEach((key) => {
    target[key] = mergeMetadataValue(target[key], source[key]);
  });
  return target;
}

function contextRecordDetails(records = []) {
  return records.reduce((merged, record) => {
    if (!isRecord(record)) return merged;
    const payload = isRecord(record.payload) ? record.payload : {};
    addMetadataSource(merged, payload);
    if (isRecord(payload.data)) addMetadataSource(merged, payload.data);
    return merged;
  }, {});
}

function readableMetadata(node, records = []) {
  const merged = {};
  if (isRecord(node?.description)) addMetadataSource(merged, node.description);
  else if (node?.description !== undefined && node?.description !== null && node?.description !== "") merged.description = node.description;

  const metadata = isRecord(node?.metadata) ? node.metadata : {};
  if (isRecord(metadata)) addMetadataSource(merged, metadata);
  if (isRecord(metadata.data)) addMetadataSource(merged, metadata.data);
  addMetadataSource(merged, contextRecordDetails(records));
  return merged;
}

async function loadNodeContextRecords(nodeId, selectedVersionId) {
  try {
    const response = await getStructuredContext(selectedVersionId, { node_id: nodeId });
    if (String(state.selectedNodeId) !== String(nodeId) || String(versionId()) !== String(selectedVersionId)) return;
    state.selectedNodeContextRecords = response?.data?.records || [];
    renderMetadataPanel();
  } catch (_error) {
    // The version payload already contains the JSONB projection. Context records
    // enrich it when the endpoint is available, but must not blank the panel if
    // an older deployment does not expose that optional read projection.
  }
}

export function buildMetadataSections(node, records = []) {
  const detail = readableMetadata(node, records);
  const consumed = new Set();
  const known = (canonical) => {
    const keys = metadataAliases[canonical] || [canonical];
    const values = keys.filter((key) => detail[key] !== undefined && detail[key] !== null && detail[key] !== "");
    values.forEach((key) => consumed.add(key));
    return values.reduce((value, key) => mergeMetadataValue(value, detail[key]), undefined);
  };
  const description = known("description");
  const summary = known("summary");
  const objective = known("objective");
  const controls = known("controls");
  const contracts = known("contracts");
  const assignments = known("assignments");
  const hasContracts = contracts !== undefined && contracts !== null && contracts !== "";
  const hasAssignments = assignments !== undefined && assignments !== null && assignments !== "";
  const contractValues = [contracts, assignments]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .flatMap((value) => Array.isArray(value) ? value : [value]);
  const contractsAndAssignments = hasContracts && hasAssignments
    ? contractValues
    : (hasContracts ? contracts : (hasAssignments ? assignments : undefined));
  const sections = [
    ["Descripción funcional", description],
    ["Resumen", sameJson(summary, description) ? undefined : summary],
    ["Objetivo", objective],
    ["Entradas", detail.inputs],
    ["Salidas", detail.outputs],
    ["Parámetros", detail.parameters],
    ["Controles", controls],
    ["Contratos y asignaciones", contractsAndAssignments],
  ];
  ["inputs", "outputs", "parameters"].forEach((key) => { if (detail[key] !== undefined) consumed.add(key); });
  const extraSections = Object.keys(detail)
    .filter((key) => !consumed.has(key) && (key !== "data" || !isRecord(detail[key])))
    .map((key) => [`Clave: ${key}`, detail[key]]);
  return sections.concat(extraSections);
}

function renderMetadataPanel(editing = false) {
  const target = document.getElementById("pm-metadata-content");
  if (!target) return;
  const node = (state.version?.nodes || []).find((item) => String(item.node_id) === String(state.selectedNodeId));
  if (!node) {
    target.innerHTML = '<div class="pm-metadata-empty"><p class="pm-eyebrow">Contexto del elemento</p><h2>Sin selección</h2><p>Selecciona una tarjeta del flujo para consultar su descripción industrial.</p></div>';
    return;
  }
  const metadata = node.metadata || {};
  if (editing) {
    target.innerHTML = `<div class="pm-metadata-head"><div><p class="pm-eyebrow">Metadatos JSON</p><h2>${esc(node.node_code)}</h2><p>${esc(node.name)}</p></div></div><form id="pm-metadata-form" class="pm-metadata-form"><label for="pm-metadata-json">Documento libre del elemento</label><textarea id="pm-metadata-json" name="metadata_json" rows="24" required>${esc(JSON.stringify(metadata, null, 2))}</textarea><p class="pm-help-text">Campos sugeridos: purpose, detailed_description, method_of_operation, inputs, outputs, materials, equipment, personnel, parameters, quality_controls, acceptance_criteria, safety_notes, failure_modes, references y open_questions.</p><div class="pm-metadata-actions"><button type="button" class="pm-secondary" data-pm-action="cancel-metadata-edit">Cancelar</button><button type="submit" class="pm-primary" data-pm-action="save-metadata">Guardar metadatos</button></div></form>`;
    return;
  }
  const field = (label, value) => value === undefined ? "" : `<section class="pm-metadata-section"><h3>${label}</h3>${metadataText(value)}</section>`;
  const sections = buildMetadataSections(node, state.selectedNodeContextRecords);
  target.innerHTML = `<div class="pm-metadata-head"><div><p class="pm-eyebrow">${esc(node.node_type)}</p><h2>${esc(node.node_code)}</h2><p>${esc(node.name)}</p></div><button type="button" class="pm-secondary pm-metadata-edit" data-pm-action="edit-metadata">Editar</button></div><div class="pm-metadata-scroll">${sections.map(([label, value]) => field(esc(label), value)).join("")}</div>`;
}

async function saveMetadataFromForm(form) {
  const nodeId = state.selectedNodeId;
  let metadata;
  try {
    metadata = JSON.parse(new FormData(form).get("metadata_json"));
  } catch (_error) {
    throw new Error("Los metadatos deben contener un JSON válido.");
  }
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") throw new Error("Los metadatos deben ser un objeto JSON.");
  await updateNodeMetadata(nodeId, metadata);
  const node = (state.version?.nodes || []).find((item) => String(item.node_id) === String(nodeId));
  if (node) node.metadata = metadata;
  renderMetadataPanel();
  message("Metadatos guardados.");
}

function paletteTypeLabel(type) {
  return ({ subprocess: "proceso", operation: "operación", output: "salida", stock: "stock", decision: "decisión" }[type] || type);
}

export function nextNodeCode(nodes = [], nodeType = "operation") {
  const prefix = ({ subprocess: "PROC", operation: "OP", stock: "STOCK", decision: "DECISION" }[nodeType] || String(nodeType || "NODE").toUpperCase());
  const used = new Set(nodes.map((node) => String(node.node_code || "").toUpperCase()));
  let number = 1;
  while (used.has(`${prefix}-${String(number).padStart(3, "0")}`)) number += 1;
  return `${prefix}-${String(number).padStart(3, "0")}`;
}

function openPaletteModal(type) {
  if (!versionId()) return message("Selecciona una versión antes de añadir elementos.", true);
  if (!state.selectedNodeId) return message("Selecciona primero un elemento del diagrama.", true);
  state.paletteModalType = type;
  state.paletteModalMode = "create";
  state.editingNodeId = "";
  const modal = document.getElementById("pm-node-modal");
  const form = document.getElementById("pm-palette-node-form");
  if (!modal || !form) return;
  form.reset();
  form.elements.node_type.value = type;
  document.getElementById("pm-palette-code").value = nextNodeCode(state.version.nodes || [], type);
  document.getElementById("pm-palette-code").readOnly = true;
  document.querySelector('[data-pm-action="create-palette-node"]').textContent = "Guardar elemento";
  document.getElementById("pm-node-modal-title").textContent = `Añadir ${paletteTypeLabel(type)}`;
  const selected = (state.version.nodes || []).find((node) => String(node.node_id) === String(state.selectedNodeId));
  document.getElementById("pm-node-modal-context").textContent = `Se conectará después de ${selected?.node_code || "el elemento seleccionado"}.`;
  document.querySelector(".pm-palette-stock-fields")?.toggleAttribute("hidden", type !== "stock");
  document.querySelector(".pm-palette-child-fields")?.toggleAttribute("hidden", type !== "subprocess");
  const branchField = document.querySelector(".pm-palette-branch-fields");
  const branchSelect = document.getElementById("pm-palette-branch-label");
  const isDecisionChild = selected?.node_type === "decision";
  if (branchField) branchField.toggleAttribute("hidden", !isDecisionChild);
  if (branchSelect) {
    const usedLabels = new Set((state.version.transitions || [])
      .filter((edge) => String(edge.source_node_id) === String(selected?.node_id) && edge.transition_type === "branch")
      .map((edge) => String(edge.label || "")));
    branchSelect.innerHTML = `<option value="">Selecciona Sí o No</option>${["Sí", "No"].map((label) => `<option value="${label}"${usedLabels.has(label) ? " disabled" : ""}>${label}${usedLabels.has(label) ? " (ya utilizada)" : ""}</option>`).join("")}`;
    branchSelect.required = isDecisionChild;
    branchSelect.value = "";
  }
  modal.hidden = false;
  modal.classList.add("is-open");
  document.getElementById("pm-palette-code")?.focus();
}

function closePaletteModal() {
  const modal = document.getElementById("pm-node-modal");
  if (modal) {
    modal.hidden = true;
    modal.classList.remove("is-open");
  }
  state.paletteModalType = "";
  state.paletteModalMode = "create";
  state.editingNodeId = "";
}

function editSelectedNode() {
  const node = (state.version?.nodes || []).find((item) => String(item.node_id) === String(state.selectedNodeId));
  if (!node) return message("Selecciona un elemento del diagrama para editarlo.", true);
  const modal = document.getElementById("pm-node-modal");
  const form = document.getElementById("pm-palette-node-form");
  if (!modal || !form) return;
  state.paletteModalMode = "edit";
  state.editingNodeId = node.node_id;
  form.elements.node_type.value = node.node_type;
  document.getElementById("pm-palette-code").value = node.node_code || "";
  document.getElementById("pm-palette-code").readOnly = true;
  document.getElementById("pm-palette-name").value = node.name || "";
  document.getElementById("pm-palette-description").value = node.description || "";
  const stock = node.properties?.stock || {};
  document.getElementById("pm-palette-stock-capacity").value = stock.capacity ?? 24;
  document.getElementById("pm-palette-stock-quantity").value = stock.initial_quantity ?? 0;
  document.getElementById("pm-palette-stock-unit").value = stock.unit || "unidades";
  const child = document.getElementById("pm-palette-child-process");
  if (child) child.value = node.child_process_id || "";
  document.getElementById("pm-node-modal-title").textContent = `Editar ${paletteTypeLabel(node.node_type)}`;
  document.getElementById("pm-node-modal-context").textContent = `Editando ${node.node_code}. Las relaciones existentes se conservan.`;
  document.querySelector('[data-pm-action="create-palette-node"]').textContent = "Guardar cambios";
  document.querySelector(".pm-palette-stock-fields")?.toggleAttribute("hidden", node.node_type !== "stock");
  document.querySelector(".pm-palette-child-fields")?.toggleAttribute("hidden", node.node_type !== "subprocess");
  document.querySelector(".pm-palette-branch-fields")?.toggleAttribute("hidden", true);
  modal.hidden = false;
  modal.classList.add("is-open");
  document.getElementById("pm-palette-name")?.focus();
}

async function deleteSelectedNode() {
  const node = (state.version?.nodes || []).find((item) => String(item.node_id) === String(state.selectedNodeId));
  if (!node) return message("Selecciona un elemento del diagrama para eliminarlo.", true);
  if (!window.confirm(`¿Eliminar ${node.node_code} — ${node.name}? También se eliminarán sus relaciones.`)) return;
  await deleteNode(node.node_id);
  state.version = (await getVersion(versionId())).data;
  state.selectedNodeId = "";
  editor();
  message("Elemento eliminado del flujo.");
}

async function createPaletteNodeFromForm(form) {
  const formData = new FormData(form);
  const nodeType = formData.get("node_type");
  const data = { node_code: nextNodeCode(state.version.nodes || [], nodeType), node_type: nodeType, name: formData.get("name"), description: formData.get("description") || null };
  const parent = (state.version.nodes || []).find((node) => String(node.node_id) === String(state.selectedNodeId));
  const branch = parent?.node_type === "decision";
  const branchLabel = formData.get("label") || "";
  if (state.paletteModalMode === "create" && branch && !branchLabel) {
    return message("Selecciona si el elemento pertenece a la rama Sí o a la rama No.", true);
  }
  if (nodeType === "subprocess" && formData.get("child_process_id")) data.child_process_id = formData.get("child_process_id");
  if (nodeType === "stock") data.properties = { stock: { capacity: Number(formData.get("stock_capacity")), initial_quantity: Number(formData.get("stock_initial_quantity")), unit: formData.get("stock_unit") } };
  if (state.paletteModalMode === "edit") {
    await updateNode(state.editingNodeId, data);
    state.version = (await getVersion(versionId())).data;
    closePaletteModal();
    editor();
    message("Elemento actualizado.");
    return;
  }
  const created = (await createNode(versionId(), data)).data;
  await createTransition(versionId(), { source_node_id: state.selectedNodeId, target_node_id: created.node_id, transition_type: branch ? "branch" : "sequence", label: branch ? branchLabel : null });
  state.version = (await getVersion(versionId())).data;
  state.selectedNodeId = created.node_id;
  closePaletteModal();
  editor();
  message("Elemento guardado y conectado al flujo.");
}

function editor() {
  const target = document.getElementById("pm-editor");
  if (!target) return;
  if (!state.selectedProcess && !state.version) {
    renderEditorHtml(target, '<div class="pm-empty-state"><h2>Selecciona un proceso</h2><p>Abre una versión para inspeccionar su grafo.</p></div>');
    return;
  }
  if (!state.version) {
    renderEditorHtml(target, createVersionForm());
    return;
  }
  const expansionStack = state.expansionStack;
  renderEditorHtml(target, renderGraph(state.version, {
    expansionStack,
    zoom: state.zoom,
    zoomControl: zoomControls(),
    fullscreenControl: fullscreenButton(),
    navigationControl: parentNavigationControl(),
  }));
}

function setZoom(value) {
  state.zoom = Math.min(1, Math.max(0.35, Math.round(value * 20) / 20));
  editor();
}

function fitFlow() {
  const flow = document.querySelector(".pm-flow-scroll");
  const canvas = document.querySelector(".pm-flow");
  if (!flow || !canvas) return;
  const availableWidth = Math.max(320, flow.clientWidth - 12);
  const availableHeight = Math.max(220, flow.clientHeight - 12);
  setZoom(Math.min(1, availableWidth / canvas.offsetWidth, availableHeight / canvas.offsetHeight));
}

async function load() {
  state.status = "loading";
  try {
    const payload = await listProcesses();
    state.processes = payload.data || [];
    state.status = "ready";
    syncProcessSelector();
  } catch (error) {
    state.status = "error";
    const selector = document.getElementById("pm-process-selector");
    if (selector) selector.innerHTML = '<option value="">No se pudo cargar el catálogo</option>';
    message(error.message, true);
  }
}

async function open(processIdValue) {
  try {
    const process = await getProcess(processIdValue);
    state.selectedProcess = process.data;
    syncProcessSelector();
    const versions = process.data?.versions || [];
    const selected = versions.find((item) => item.status === "draft") || versions[versions.length - 1];
    if (!selected) {
      state.version = null;
      editor();
      return;
    }
    state.version = (await getVersion(selected.version_id)).data;
    state.expansionStack = [];
    writeModelingHash(selected.version_id);
    editor();
  } catch (error) {
    message(error.message, true);
  }
}

async function expandSubprocess(nodeId, depth = 0, requestedParentVersionId = "") {
  const activeVersion = depth === 0 ? state.version : state.expansionStack.find((item) => String(item.version?.version?.version_id || item.version?.version_id) === String(requestedParentVersionId))?.version || state.expansionStack[depth - 1]?.version;
  const parentVersionId = activeVersion?.version?.version_id || activeVersion?.version_id || versionId();
  const node = (activeVersion?.nodes || []).find((item) => String(item.node_id) === String(nodeId));
  if (!node) throw new Error("No se encontró el nodo de expansión.");
  if (node.node_type !== "subprocess" || !node.child_process_id) {
    throw new Error("El nodo seleccionado no tiene un subproceso expandible.");
  }
  if (!parentVersionId) throw new Error("No hay una versión padre seleccionada.");
  const payload = await getVersion(parentVersionId, { expandNodeId: nodeId });
  if (!payload?.data?.subprocess_context) {
    throw new Error("La API no devolvió el contexto del subproceso.");
  }
  const entry = { parentVersionId, nodeId, depth, version: payload.data, expandedHeight: null, nodeName: node.name, label: payload.data.subprocess_context?.breadcrumb_label || `${activeVersion?.process?.name || state.selectedProcess?.name || "Proceso padre"} > ${node.name}` };
  state.expansionStack = state.expansionStack.filter((item) => !(String(item.parentVersionId) === String(parentVersionId) && String(item.nodeId) === String(nodeId)));
  state.expansionStack.push(entry);
  writeModelingHash(versionId(), state.expansionStack.map((item) => item.nodeId));
  editor();
  if (state.fullscreen) focusFullscreenControl();
}

function collapseSubprocess(nodeId = "") {
  if (!nodeId && state.openedFromParent) {
    const parent = state.openedFromParent;
    state.version = parent.version;
    state.selectedProcess = parent.selectedProcess;
    state.expansionStack = parent.expansionStack || [];
    state.openedFromParent = null;
    state.zoom = 1;
    if (versionId()) writeModelingHash(versionId(), state.expansionStack.map((item) => item.nodeId));
    editor();
    return;
  }
  state.expansionStack = nodeId ? state.expansionStack.filter((item) => String(item.nodeId) !== String(nodeId)) : state.expansionStack.slice(0, -1);
  if (state.expansionStack.length) writeModelingHash(versionId(), state.expansionStack.map((item) => item.nodeId));
  else if (versionId()) writeModelingHash(versionId());
  editor();
  if (state.fullscreen) focusFullscreenControl();
}

function openSubprocessOnly(nodeId, depth = 0) {
  const expansion = state.expansionStack.find((item) => String(item.nodeId) === String(nodeId) && Number(item.depth) === Number(depth));
  if (!expansion?.version) return message("Expande primero el subproceso para abrirlo.", true);
  state.openedFromParent = {
    version: state.version,
    selectedProcess: state.selectedProcess,
    expansionStack: state.expansionStack,
  };
  state.version = expansion.version;
  state.selectedProcess = expansion.version.process || state.selectedProcess;
  state.expansionStack = [];
  state.selectedNodeId = "";
  state.zoom = 1;
  const childVersionId = expansion.version?.subprocess_context?.child_version_id || expansion.version?.version?.version_id || expansion.version?.version_id || "";
  writeModelingHash(childVersionId);
  editor();
}

function updateFullscreenDom() {
  const page = document.querySelector(".pm-page");
  const bpm = document.querySelector(".pm-bpm");
  if (page) page.classList.toggle("is-pm-focus-mode", state.fullscreen && state.fullscreenMode === "fallback");
  if (bpm) bpm.classList.toggle("is-pm-focus-mode", state.fullscreen && state.fullscreenMode === "fallback");
  document.querySelectorAll('[data-pm-action="toggle-fullscreen"]').forEach((control) => {
    control.setAttribute("aria-expanded", state.fullscreen ? "true" : "false");
    control.textContent = state.fullscreen ? "Salir de pantalla completa" : "Pantalla completa";
  });
}

function focusFullscreenControl() {
  document.querySelector('[data-pm-action="toggle-fullscreen"]')?.focus();
}

function scheduleRelayout() {
  if (relayoutFrame) cancelAnimationFrame(relayoutFrame);
  relayoutFrame = requestAnimationFrame(() => {
    relayoutFrame = 0;
    editor();
  });
}

async function toggleFullscreen() {
  if (state.fullscreen) {
    if (state.fullscreenMode === "native" && document.fullscreenElement && typeof document.exitFullscreen === "function") {
      try { await document.exitFullscreen(); } catch (_error) { /* keep the local state reversible */ }
    }
    state.fullscreen = false;
    state.fullscreenMode = null;
    updateFullscreenDom();
    focusFullscreenControl();
    return;
  }

  // Keep the fullscreen element outside #pm-editor: expanding a subprocess
  // re-renders that node and must not destroy the active fullscreen element.
  const fullscreenRoot = document.getElementById("pm-fullscreen-root");
  const nativeAvailable = fullscreenRoot && typeof fullscreenRoot.requestFullscreen === "function" && document.fullscreenEnabled !== false;
  if (nativeAvailable) {
    try {
      await fullscreenRoot.requestFullscreen();
      state.fullscreen = true;
      state.fullscreenMode = "native";
      updateFullscreenDom();
      focusFullscreenControl();
      return;
    } catch (_error) {
      // Permission/user-agent restrictions use the reversible fallback below.
    }
  }
  state.fullscreen = true;
  state.fullscreenMode = "fallback";
  updateFullscreenDom();
  focusFullscreenControl();
}

async function restoreFromHash() {
  const versionIdValue = hashContext().get("version_id");
  if (!versionIdValue) return;
  const payload = await getVersion(versionIdValue);
  state.version = payload.data;
  state.selectedProcess = payload.data.process || null;
  const expansionPath = (hashContext().get("expansion_path") || hashContext().get("node_id") || "").split(",").filter(Boolean);
  // `expansion_path` may contain a true nested path or several sibling
  // subprocesses expanded from the same root version. Restore each sibling
  // against the root instead of incorrectly looking for it inside the child
  // version expanded immediately before it.
  for (let index = 0; index < expansionPath.length; index += 1) {
    const nodeId = expansionPath[index];
    const rootNode = (state.version.nodes || []).find((node) => String(node.node_id) === String(nodeId));
    if (rootNode) {
      await expandSubprocess(nodeId, 0, versionIdValue);
      continue;
    }
    const parentEntry = [...state.expansionStack].reverse().find((entry) => (entry.version?.nodes || []).some((node) => String(node.node_id) === String(nodeId)));
    if (!parentEntry) throw new Error(`No se encontró el subproceso de la ruta de expansión: ${nodeId}`);
    const parentVersion = parentEntry.version?.version?.version_id || parentEntry.version?.version_id || "";
    const parentDepth = Number(parentEntry.depth || 0) + 1;
    await expandSubprocess(nodeId, parentDepth, parentVersion);
  }
  editor();
}

async function createProcessFromForm(form) {
  const formData = new FormData(form);
  const created = (await createProcess({ process_code: formData.get("process_code"), name: formData.get("name") })).data;
  state.selectedProcess = created;
  state.version = null;
  form.reset();
  await load();
  editor();
  message("Proceso guardado. Ahora crea una versión draft.");
}

async function createVersionFromUi() {
  const created = (await createVersion(processId(), { change_description: "Versión inicial" })).data;
  state.version = (await getVersion(created.version_id)).data;
  editor();
  message("Versión draft creada.");
}

async function createNodeFromForm(form) {
  const formData = new FormData(form);
  const data = {
    node_code: formData.get("node_code"),
    node_type: formData.get("node_type"),
    name: formData.get("name"),
  };
  if (data.node_type === "subprocess" && formData.get("child_process_id")) data.child_process_id = formData.get("child_process_id");
  if (data.node_type === "output") data.output_role = formData.get("output_role") || "normal";
  if (data.node_type === "stock") data.properties = { stock: { capacity: Number(formData.get("stock_capacity")), initial_quantity: Number(formData.get("stock_initial_quantity")), unit: formData.get("stock_unit") } };
  await createNode(versionId(), data);
  state.version = (await getVersion(versionId())).data;
  editor();
  message("Nodo guardado.");
}

async function createTransitionFromForm(form) {
  const formData = new FormData(form);
  await createTransition(versionId(), {
    source_node_id: formData.get("source_node_id"),
    target_node_id: formData.get("target_node_id"),
    transition_type: formData.get("transition_type"),
    label: formData.get("label") || null,
  });
  state.version = (await getVersion(versionId())).data;
  editor();
  message("Transición guardada.");
}

async function action(actionName, eventTarget) {
  try {
    if (actionName === "refresh") return load();
    if (actionName === "toggle-fullscreen") return toggleFullscreen();
    if (actionName === "zoom-in") return setZoom(state.zoom + 0.1);
    if (actionName === "zoom-out") return setZoom(state.zoom - 0.1);
    if (actionName === "zoom-fit") return fitFlow();
    if (actionName === "open-subprocess") return openSubprocessOnly(eventTarget.dataset.pmOpenNode, Number(eventTarget.dataset.pmOpenDepth || 0));
    if (actionName === "select-palette-node") return openPaletteModal(eventTarget.dataset.pmPaletteType);
    if (actionName === "edit-selected-node") return editSelectedNode();
    if (actionName === "delete-selected-node") return deleteSelectedNode();
    if (actionName === "edit-metadata") return renderMetadataPanel(true);
    if (actionName === "cancel-metadata-edit") return renderMetadataPanel(false);
    if (actionName === "save-metadata") return saveMetadataFromForm(eventTarget.closest("form"));
    if (actionName === "close-palette-modal") return closePaletteModal();
    if (actionName === "focus-process-form") {
      document.getElementById("pm-process-code")?.focus();
      return;
    }
    if (actionName === "create-version" && processId()) return createVersionFromUi();
    if (actionName === "validate" && versionId()) {
      const result = await validateVersion(versionId());
      message(result.data.valid ? "Versión válida." : "Hay errores de validación.", !result.data.valid);
      state.version.validation = result.data;
      editor();
    }
    if (actionName === "create-process") return createProcessFromForm(eventTarget.closest("form"));
    if (actionName === "create-node") return createNodeFromForm(eventTarget.closest("form"));
    if (actionName === "create-transition") return createTransitionFromForm(eventTarget.closest("form"));
    if (actionName === "create-palette-node") return createPaletteNodeFromForm(eventTarget.closest("form"));
    if (actionName === "expand-subprocess") {
      const nodeId = eventTarget.dataset.pmNodeId || eventTarget.closest("[data-node-id]")?.dataset.nodeId;
      const depth = Number(eventTarget.closest("[data-pm-expansion-depth]")?.dataset.pmExpansionDepth || 0);
      const parentVersionId = eventTarget.closest("[data-pm-parent-version-id]")?.dataset.pmParentVersionId || "";
      return await expandSubprocess(nodeId, depth, parentVersionId);
    }
    if (actionName === "collapse-subprocess") return collapseSubprocess(eventTarget.dataset.pmCollapseNode || "");
  } catch (error) {
    message(error.message, true);
  }
}

export function renderProcessModeling() {
  const main = document.createElement("div");
  main.innerHTML = shell();
  main.querySelector(".pm-layout")?.insertAdjacentHTML("beforeend", metadataPanelShell());
  return {
    main,
    afterMount: async () => {
      const onResize = () => scheduleRelayout();
      // The graph can become visible before the asynchronous catalog/version
      // loading finishes. Bind metadata actions up front so the right panel
      // cannot expose a form before its save/cancel handlers exist.
      main.addEventListener("submit", (event) => {
        if (event.target.id !== "pm-metadata-form") return;
        event.preventDefault();
        void saveMetadataFromForm(event.target).catch((error) => message(error.message, true));
      });
      main.addEventListener("click", (event) => {
        const actionable = event.target.closest("[data-pm-action]");
        if (!actionable) return;
        if (actionable.dataset.pmAction === "edit-metadata") return renderMetadataPanel(true);
        if (actionable.dataset.pmAction === "cancel-metadata-edit") return renderMetadataPanel(false);
      });
      const onFullscreenChange = () => {
        if (document.fullscreenElement || state.fullscreenMode !== "native") return;
        state.fullscreen = false;
        state.fullscreenMode = null;
        updateFullscreenDom();
        focusFullscreenControl();
        scheduleRelayout();
      };
      await load();
      await restoreFromHash().catch((error) => { message(error.message, true); editor(); });
      syncProcessSelector();
      editor();
      renderMetadataPanel();
      main.addEventListener("submit", (event) => {
        if (event.target.id === "pm-metadata-form") return;
        event.preventDefault();
        void action(event.submitter?.dataset.pmAction, event.submitter || event.target);
      });
      main.addEventListener("change", (event) => {
        if (event.target.id === "pm-node-type") syncNodeFields();
        if (event.target.id === "pm-process-selector" && event.target.value) void open(event.target.value);
      });
      syncNodeFields();
      main.addEventListener("keydown", (event) => {
        const card = event.target.closest('[data-pm-action="expand-subprocess"]');
        if (card && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          void action("expand-subprocess", card);
        }
      });
      main.addEventListener("click", (event) => {
        const card = event.target.closest(".pm-bpm-card[data-node-id]");
        if (card) {
          selectNode(card.dataset.nodeId);
          if (!event.target.closest("button") && !card.dataset.pmExpandNode) return;
        }
        const collapse = event.target.closest('[data-pm-action="collapse-subprocess"]');
        if (collapse) {
          event.preventDefault();
          void action("collapse-subprocess", collapse);
          return;
        }
        const openOnly = event.target.closest('[data-pm-action="open-subprocess"]');
        if (openOnly) {
          event.preventDefault();
          void action("open-subprocess", openOnly);
          return;
        }
        const expandable = event.target.closest("[data-pm-expand-node]");
        if (expandable) {
          event.preventDefault();
          void action("expand-subprocess", expandable);
          return;
        }
        const actionable = event.target.closest("[data-pm-action]");
        if (actionable && actionable.dataset.pmAction !== "create-process" && actionable.dataset.pmAction !== "create-node" && actionable.dataset.pmAction !== "create-transition" && actionable.dataset.pmAction !== "edit-metadata" && actionable.dataset.pmAction !== "cancel-metadata-edit" && actionable.dataset.pmAction !== "save-metadata") {
          void action(actionable.dataset.pmAction, actionable);
        }
      });
      window.addEventListener("resize", onResize);
      document.addEventListener("fullscreenchange", onFullscreenChange);
      if (document.fonts?.ready) {
        // Font readiness must not replace an already interactive graph while
        // Playwright/users are scrolling or activating a sibling subprocess.
        // The first render measures the current canvas metrics; later layout
        // changes are driven by explicit resize/expand/collapse actions.
        document.fonts.ready.then(() => {
          if (!document.querySelector(".pm-flow-scroll")) scheduleRelayout();
        }).catch(() => {});
      }
      document.fonts?.addEventListener?.("loadingdone", () => {
        if (!document.querySelector(".pm-flow-scroll")) onResize();
      });
    },
  };
}
