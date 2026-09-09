import { createProcess, createNode, createNodeWithTransition, updateNode, updateNodeMetadata, getStructuredContext, createTransition, getProcess, listProcesses, validateProcess, insertOperation, deleteOperation } from "../../api/process-modeling.js";
import { renderGraph } from "../../components/process-modeling/graph.js";
import { createProcessModelingState } from "../../core/process-modeling-state.js";
import { parseAdvancedJson } from "../../components/json-editor.js";
import { createProcessModelingViewport } from "../../controllers/process-modeling/viewport.js";
import { createProcessModelingExpansion } from "../../controllers/process-modeling/expansion.js";
import { createProcessModelingNodeActions } from "../../controllers/process-modeling/node-actions.js";

const state = createProcessModelingState();
const flowScrollPosition = { left: 0, top: 0 };
const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const viewport = createProcessModelingViewport({ state, editor: () => editor() });
const expansion = createProcessModelingExpansion({ state, modelProcessId, getProcess, writeModelingHash, editor: () => editor(), message, focusFullscreenControl: viewport.focusFullscreenControl });
const nodeActions = createProcessModelingNodeActions({ state, modelProcessId, getProcess, createNode, createNodeWithTransition, updateNode, deleteNode: null, insertOperation, deleteOperation, createTransition, editor: () => editor(), message, closePaletteModal, navigateToSelectedNodeDetail });

function shell() {
  return `<main class="pm-page"><div class="pm-header"><div class="pm-header-title"><a class="pm-home-link" href="#/inicio">← Menú inicial</a><p class="pm-eyebrow">Diseño industrial</p><h1>Modelado de procesos</h1><p class="pm-subtitle">Define nodos y transiciones con trazabilidad.</p></div><div class="pm-header-actions"><div class="pm-process-selector"><label for="pm-process-selector">Proceso seleccionado</label><select id="pm-process-selector" aria-describedby="pm-process-selector-help"><option value="">Selecciona un proceso</option></select><span id="pm-process-selector-help" class="pm-help-text">La selección conserva el proceso y el contexto del editor.</span></div><button class="pm-primary" type="button" data-pm-action="focus-process-form">Nuevo proceso</button></div></div><form id="pm-process-form" class="pm-form pm-process-form"><div><label for="pm-process-name">Nombre</label><input id="pm-process-name" name="name" required autocomplete="off" placeholder="Proceso de fabricación"></div><button class="pm-primary" type="submit" data-pm-action="create-process">Crear proceso</button></form><div id="pm-message" class="pm-message" role="status" aria-live="polite"></div><div class="pm-layout"><aside class="pm-node-palette" aria-label="Opciones del flujo"><p class="pm-eyebrow">Opciones del flujo</p><p id="pm-palette-help" class="pm-palette-help">Selecciona un elemento del diagrama.</p><div class="pm-palette-items"><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="subprocess"><span class="pm-palette-symbol pm-palette-symbol-process">▱</span><span>Proceso</span></button><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="operation"><span class="pm-palette-symbol pm-palette-symbol-operation">□</span><span>Operación</span></button><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="output"><span class="pm-palette-symbol pm-palette-symbol-output">○</span><span>Salida</span></button><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="stock"><span class="pm-palette-symbol pm-palette-symbol-stock">▤</span><span>Stock</span></button><button type="button" class="pm-palette-item" data-pm-action="select-palette-node" data-pm-palette-type="decision"><span class="pm-palette-symbol pm-palette-symbol-decision">◇</span><span>Decisión</span></button></div><div class="pm-palette-actions" aria-label="Editar o eliminar elemento seleccionado"><button type="button" class="pm-palette-action" data-pm-action="edit-selected-node" disabled>Editar</button><button type="button" class="pm-palette-action pm-palette-action-danger" data-pm-action="delete-selected-node" disabled>Eliminar</button><button type="button" class="pm-palette-action" data-pm-action="insert-selected-operation" disabled>Insertar operación</button></div></aside><section class="pm-panel pm-editor"><div id="pm-fullscreen-root" class="pm-fullscreen-root"><div id="pm-editor"><div class="pm-loading">Cargando modelado…</div></div></div></section></div><div id="pm-node-modal" class="pm-modal-overlay" hidden><div class="pm-node-modal" role="dialog" aria-modal="true" aria-labelledby="pm-node-modal-title"><div class="pm-node-modal-head"><div><p class="pm-eyebrow">Elemento del flujo</p><h2 id="pm-node-modal-title">Añadir al flujo</h2><p id="pm-node-modal-context" class="pm-help-text"></p></div><button type="button" class="pm-modal-close" data-pm-action="close-palette-modal" aria-label="Cerrar">×</button></div><form id="pm-palette-node-form" class="pm-palette-form"><input type="hidden" name="node_type" value="operation"><div><label for="pm-palette-name">Nombre</label><input id="pm-palette-name" name="name" required autocomplete="off" placeholder="Nombre del elemento"></div><div><label for="pm-palette-description">Descripción</label><textarea id="pm-palette-description" name="description" rows="2" placeholder="Información opcional"></textarea></div><div class="pm-palette-stock-fields" hidden><label for="pm-palette-stock-capacity">Capacidad</label><input id="pm-palette-stock-capacity" name="stock_capacity" type="number" min="1" value="24"><label for="pm-palette-stock-quantity">Cantidad inicial</label><input id="pm-palette-stock-quantity" name="stock_initial_quantity" type="number" min="0" value="0"><label for="pm-palette-stock-unit" name="stock_unit">Unidad</label><input id="pm-palette-stock-unit" name="stock_unit" value="unidades"></div><div class="pm-palette-child-fields" hidden><label for="pm-palette-child-process">Proceso hijo</label><select id="pm-palette-child-process" name="child_process_id"><option value="">Selecciona un proceso hijo</option>${processOptions()}</select></div><div class="pm-palette-branch-fields" hidden><label for="pm-palette-branch-label">Salida desde la decisión</label><select id="pm-palette-branch-label" name="label" required><option value="">Selecciona Sí o No</option><option value="Sí">Sí</option><option value="No">No</option></select><span class="pm-help-text">Indica qué rama de la decisión representa esta salida.</span></div><div class="pm-node-modal-actions"><button type="button" class="pm-secondary" data-pm-action="close-palette-modal">Cancelar</button><button type="submit" class="pm-primary" data-pm-action="create-palette-node">Guardar elemento</button></div></form></div></div><div id="pm-metadata-modal" class="pm-modal-overlay" hidden><div class="pm-node-modal pm-metadata-modal" role="dialog" aria-modal="true" aria-labelledby="pm-metadata-modal-title"><div class="pm-node-modal-head"><div><p class="pm-eyebrow">Metadatos JSON</p><h2 id="pm-metadata-modal-title">Editar metadatos</h2><p id="pm-metadata-modal-context" class="pm-help-text"></p></div><button type="button" class="pm-modal-close" data-pm-action="close-metadata-modal" aria-label="Cerrar">×</button></div><form id="pm-metadata-form" class="pm-metadata-form"><div id="pm-metadata-fields" class="pm-metadata-fields"></div><p class="pm-help-text">Cada propiedad conserva su tipo. Los objetos y listas se editan como JSON dentro de su propio campo.</p><div class="pm-node-modal-actions"><button type="button" class="pm-secondary" data-pm-action="cancel-metadata-edit">Cancelar</button><button type="submit" class="pm-primary" data-pm-action="save-metadata">Guardar metadatos</button></div></form></div></div></main>`;
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

function modelProcessId() {
  return state.process?.process_id;
}

function processId() {
  return state.selectedProcess?.process_id || state.selectedProcess?.id;
}

function writeModelingHash(modelProcessIdValue, nodeIdValue = "") {
  const params = new URLSearchParams({ process_id: modelProcessIdValue });
  const path = Array.isArray(nodeIdValue) ? nodeIdValue : (nodeIdValue ? [nodeIdValue] : []);
  if (path.length) {
    params.set("node_id", path[path.length - 1]);
    params.set("expansion_path", path.join(","));
  }
  window.history.replaceState({}, "", `#/studio-procesos?${params.toString()}`);
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

function syncTransitionForm() {
  const form = document.getElementById("pm-transition-form");
  if (!form || !state.process) return;
  const operations = (state.process.nodes || []).filter((node) => node.node_type === "operation");
  const options = `<option value="">Selecciona una operación</option>${nodeOptions(operations)}`;
  form.elements.source_node_id.innerHTML = options;
  form.elements.target_node_id.innerHTML = options;
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
  viewport.updateFullscreenDom();
  updateNodeSelection();
  syncTransitionForm();
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
  const insert = document.querySelector('[data-pm-action="insert-selected-operation"]');
  if (insert) insert.disabled = !state.selectedTransitionId;
}

function selectNode(nodeId) {
  state.selectedNodeId = nodeId || "";
  state.selectedNodeContextRecords = [];
  state.selectedNodeContextDetail = null;
  updateNodeSelection();
  renderMetadataPanel();
  if (state.selectedNodeId && modelProcessId()) void loadNodeContextRecords(state.selectedNodeId, modelProcessId());
}

function metadataText(value) {
  if (Array.isArray(value)) return value.length ? `<ul>${value.map((item) => `<li>${esc(typeof item === "string" ? item : JSON.stringify(item))}</li>`).join("")}</ul>` : '<p class="pm-metadata-muted">Sin información</p>';
  if (value && typeof value === "object") return `<pre>${esc(JSON.stringify(value, null, 2))}</pre>`;
  return value !== undefined && value !== null && value !== "" ? `<p>${esc(value)}</p>` : '<p class="pm-metadata-muted">Sin información</p>';
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function loadNodeContextRecords(nodeId, selectedProcessId) {
  try {
    const response = await getStructuredContext(selectedProcessId, { node_id: nodeId });
    if (String(state.selectedNodeId) !== String(nodeId) || String(modelProcessId()) !== String(selectedProcessId)) return;
    state.selectedNodeContextRecords = response?.data?.records || [];
    state.selectedNodeContextDetail = response?.data?.details?.find((item) => String(item.node_id) === String(nodeId))?.context_detail || null;
    renderMetadataPanel();
  } catch (_error) {
    // The process payload already contains the JSONB projection. Context records
    // enrich it when the endpoint is available, but must not blank the panel if
    // an older deployment does not expose that optional read projection.
  }
}

export function buildMetadataSections(node, records = []) {
  const detail = node?.context_detail || {};
  const sections = [
    ["Descripción funcional", detail.description],
    ["Resumen", detail.summary],
    ["Objetivo", detail.objective],
    ["Entradas", detail.inputs],
    ["Salidas", detail.outputs],
    ["Parámetros", detail.parameters],
    ["Controles", detail.controls],
    ["Contratos y asignaciones", detail.contracts_and_assignments],
  ];
  return sections.concat(Object.entries(detail.additional || {}).map(([key, value]) => [`Clave: ${key}`, value]));
}

function metadataFieldValue(value) {
  if (value !== null && typeof value === "object") return JSON.stringify(value, null, 2);
  return value === null || value === undefined ? "" : String(value);
}

const OPERATION_EDIT_FIELDS = [
  ["description", "Descripción funcional"],
  ["inputs", "Entradas"],
  ["outputs", "Salidas"],
  ["parameters", "Parámetros"],
  ["controls", "Controles"],
  ["contracts", "Contratos"],
  ["assignments", "Asignaciones"],
];

function metadataFieldKind(value) {
  return value === null ? "null" : value !== null && typeof value === "object" ? "json" : typeof value;
}

export function metadataEditFields(metadata = {}, node = null) {
  const data = isRecord(metadata?.data) ? metadata.data : {};
  if (node?.node_type !== "operation") {
    return Object.entries(data).map(([key, value], index) => ({
      key, value: metadataFieldValue(value), kind: metadataFieldKind(value), id: `pm-metadata-field-${index}`,
    }));
  }
  const knownKeys = new Set(OPERATION_EDIT_FIELDS.map(([key]) => key));
  const fields = OPERATION_EDIT_FIELDS.map(([key, label], index) => {
    const aliases = key === "description" ? ["description", "operation_description", "detailed_description"]
      : key === "controls" ? ["controls", "quality_controls"]
        : key === "contracts" ? ["contracts", "declarative_contract"]
          : key === "assignments" ? ["assignments", "operation_machine_assignments"] : [key];
    const sourceKey = aliases.find((candidate) => data[candidate] !== undefined);
    const value = sourceKey ? data[sourceKey] : key === "description" ? (node.description || "") : "";
    return { key, label, value: metadataFieldValue(value), kind: metadataFieldKind(value), id: `pm-metadata-field-${index}` };
  });
  Object.entries(data).forEach(([key, value]) => {
    if (knownKeys.has(key) || ["operation_description", "detailed_description", "quality_controls", "declarative_contract", "operation_machine_assignments", "additional_fields"].includes(key)) return;
    fields.push({ key, label: key, value: metadataFieldValue(value), kind: metadataFieldKind(value), id: `pm-metadata-field-${fields.length}` });
  });
  return fields;
}

export function mergeEditedMetadataData(metadata = {}, data = {}) {
  const envelope = isRecord(metadata) ? metadata : {};
  return { ...envelope, data: isRecord(data) ? data : {} };
}

export function additionalFieldMarkup(item = {}, index = 0) {
  return `<div class="pm-metadata-additional-field" data-metadata-additional-field>
    <div class="pm-metadata-field"><label for="pm-metadata-additional-title-${index}">Título del campo</label><input id="pm-metadata-additional-title-${index}" data-metadata-additional-title value="${esc(item.title || "")}" autocomplete="off" placeholder="Ej. Criterios de aceptación"></div>
    <div class="pm-metadata-field"><label for="pm-metadata-additional-description-${index}">Descripción</label><textarea id="pm-metadata-additional-description-${index}" data-metadata-additional-description rows="3" placeholder="Describe el campo de la operación">${esc(item.description || "")}</textarea></div>
    <div class="pm-node-modal-actions pm-metadata-additional-actions"><button type="button" class="pm-secondary pm-metadata-save-field" data-pm-action="save-metadata-field" aria-pressed="false">Guardar campo</button><button type="button" class="pm-secondary pm-metadata-remove-field" data-pm-action="remove-metadata-field">Eliminar campo</button></div>
  </div>`;
}

export function validateAdditionalFieldDraft(fields, candidateIndex) {
  const candidate = fields[candidateIndex] || {};
  const title = String(candidate.title || "").trim();
  const description = String(candidate.description || "").trim();
  if (!title || !description) throw new Error("Cada campo adicional necesita título y descripción.");
  const normalizedTitle = title.toLocaleLowerCase();
  const duplicate = fields.some((field, index) => index !== candidateIndex
    && String(field.title || "").trim().toLocaleLowerCase() === normalizedTitle);
  if (duplicate) throw new Error("Los títulos de los campos adicionales no pueden repetirse.");
  return { title, description };
}

function metadataEditFieldMarkup(metadata, node = null) {
  const fields = metadataEditFields(metadata, node);
  const operation = node?.node_type === "operation";
  const data = isRecord(metadata?.data) ? metadata.data : {};
  const additional = Array.isArray(data.additional_fields) ? data.additional_fields : [];
  if (!fields.length && !operation) return '<p class="pm-metadata-empty pm-metadata-form-empty">Este objeto JSON no tiene propiedades. Se guardará como un objeto vacío.</p>';
  const fieldMarkup = fields.map(({ key, label, value, kind, id }) => {
    const control = kind === "json"
      ? `<textarea id="${id}" data-metadata-key="${esc(key)}" data-metadata-kind="json" rows="4" required>${esc(value)}</textarea>`
      : kind === "boolean"
        ? `<select id="${id}" data-metadata-key="${esc(key)}" data-metadata-kind="boolean"><option value="true"${value === "true" ? " selected" : ""}>true</option><option value="false"${value === "false" ? " selected" : ""}>false</option></select>`
        : `<input id="${id}" type="${kind === "number" ? "number" : "text"}" data-metadata-key="${esc(key)}" data-metadata-kind="${esc(kind)}" value="${esc(value)}" autocomplete="off">`;
    return `<div class="pm-metadata-field"><label for="${id}">${esc(label || key)}</label>${control}<span class="pm-help-text">Clave JSON: ${esc(key)} · Tipo: ${esc(kind)}</span></div>`;
  }).join("");
  if (!operation) return fieldMarkup;
  return `${fieldMarkup}<div class="pm-metadata-additional-fields"><div class="pm-metadata-additional-heading"><div><strong>Campos adicionales</strong><span class="pm-help-text">Se guardan en JSON como additional_fields.</span></div><button type="button" class="pm-secondary" data-pm-action="add-metadata-field">Añadir campo</button></div><div id="pm-metadata-additional-list">${additional.map(additionalFieldMarkup).join("")}</div></div>`;
}

function renderMetadataPanel(editing = false) {
  const target = document.getElementById("pm-metadata-content");
  if (!target) return;
  const node = (state.process?.nodes || []).find((item) => String(item.node_id) === String(state.selectedNodeId));
  if (!node) {
    target.innerHTML = '<div class="pm-metadata-empty"><p class="pm-eyebrow">Contexto del elemento</p><h2>Sin selección</h2><p>Selecciona una tarjeta del flujo para consultar su descripción industrial.</p></div>';
    return;
  }
  const metadata = isRecord(node.metadata) ? node.metadata : {};
  if (editing) {
    return navigateToSelectedNodeDetail(node);
  }
  const field = (label, value) => `<section class="pm-metadata-section"><h3>${label}</h3>${metadataText(value)}</section>`;
  const sections = buildMetadataSections({ context_detail: state.selectedNodeContextDetail });
  target.innerHTML = `<div class="pm-metadata-head"><div><p class="pm-eyebrow">${esc(node.node_type)}</p><h2>${esc(node.node_code)}</h2><p>${esc(node.name)}</p></div><button type="button" class="pm-secondary pm-metadata-edit" data-pm-action="edit-metadata">Editar</button></div><div class="pm-metadata-scroll">${sections.map(([label, value]) => field(esc(label), value)).join("")}</div>`;
}

async function saveMetadataFromForm(form) {
  const nodeId = state.selectedNodeId;
  const node = (state.process?.nodes || []).find((item) => String(item.node_id) === String(nodeId));
  const editedData = {};
  for (const field of form.querySelectorAll("[data-metadata-key]")) {
    const key = field.dataset.metadataKey;
    const raw = field.value;
    try {
      editedData[key] = field.dataset.metadataKind === "json"
        ? (() => { const result = parseAdvancedJson(key, raw); if (result.errors.length) throw new Error(result.errors[0].message); return result.value; })()
        : field.dataset.metadataKind === "number" ? (raw === "" ? null : Number(raw))
          : field.dataset.metadataKind === "boolean" ? raw === "true"
            : field.dataset.metadataKind === "null" ? null : raw;
      if (field.dataset.metadataKind === "number" && raw !== "" && !Number.isFinite(editedData[key])) throw new Error();
    } catch (_error) {
      throw new Error(`La propiedad «${key}» debe contener un valor ${field.dataset.metadataKind === "json" ? "JSON válido" : "válido"}.`);
    }
  }
  if (node?.node_type === "operation") {
    const additionalFields = [...form.querySelectorAll("[data-metadata-additional-field]")].map((row) => ({
      title: row.querySelector("[data-metadata-additional-title]")?.value.trim() || "",
      description: row.querySelector("[data-metadata-additional-description]")?.value.trim() || "",
    }));
    const titles = additionalFields.map((item) => item.title.toLocaleLowerCase()).filter(Boolean);
    if (additionalFields.some((item) => !item.title || !item.description)) throw new Error("Cada campo adicional necesita título y descripción.");
    if (new Set(titles).size !== titles.length) throw new Error("Los títulos de los campos adicionales no pueden repetirse.");
    editedData.additional_fields = additionalFields;
  }
  const metadata = mergeEditedMetadataData(node?.metadata, editedData);
  await updateNodeMetadata(nodeId, metadata);
  if (node) node.metadata = metadata;
  closeMetadataModal();
  renderMetadataPanel();
  message("Metadatos guardados.");
}

function addMetadataField(form) {
  const list = form.querySelector("#pm-metadata-additional-list");
  if (!list) return;
  list.insertAdjacentHTML("beforeend", additionalFieldMarkup({}, list.children.length));
  list.lastElementChild?.querySelector("[data-metadata-additional-title]")?.focus();
}

function saveMetadataField(button) {
  const row = button.closest("[data-metadata-additional-field]");
  const form = button.closest("form");
  if (!row || !form) return;
  const rows = [...form.querySelectorAll("[data-metadata-additional-field]")];
  const fields = rows.map((currentRow) => ({
    title: currentRow.querySelector("[data-metadata-additional-title]")?.value || "",
    description: currentRow.querySelector("[data-metadata-additional-description]")?.value || "",
  }));
  try {
    const savedField = validateAdditionalFieldDraft(fields, rows.indexOf(row));
    row.querySelector("[data-metadata-additional-title]").value = savedField.title;
    row.querySelector("[data-metadata-additional-description]").value = savedField.description;
    button.dataset.metadataFieldSaved = "true";
    button.setAttribute("aria-pressed", "true");
    message("Campo adicional guardado en el borrador.");
  } catch (error) {
    button.dataset.metadataFieldSaved = "false";
    button.setAttribute("aria-pressed", "false");
    message(error.message, true);
  }
}

function removeMetadataField(button) {
  button.closest("[data-metadata-additional-field]")?.remove();
}

function closeMetadataModal() {
  const modal = document.getElementById("pm-metadata-modal");
  if (modal) {
    modal.hidden = true;
    modal.classList.remove("is-open");
  }
}

function paletteTypeLabel(type) {
  return ({ subprocess: "proceso", operation: "operación", output: "salida", stock: "stock", decision: "decisión" }[type] || type);
}

function openPaletteModal(type) {
  if (!modelProcessId()) return message("Selecciona un proceso antes de añadir elementos.", true);
  if (!state.selectedNodeId) return message("Selecciona primero un elemento del diagrama.", true);
  state.paletteModalType = type;
  state.paletteModalMode = "create";
  state.editingNodeId = "";
  const modal = document.getElementById("pm-node-modal");
  const form = document.getElementById("pm-palette-node-form");
  if (!modal || !form) return;
  form.reset();
  form.elements.node_type.value = type;
  document.querySelector('[data-pm-action="create-palette-node"]').textContent = "Guardar elemento";
  document.getElementById("pm-node-modal-title").textContent = `Añadir ${paletteTypeLabel(type)}`;
  const selected = (state.process.nodes || []).find((node) => String(node.node_id) === String(state.selectedNodeId));
  document.getElementById("pm-node-modal-context").textContent = `Se conectará después de ${selected?.node_code || "el elemento seleccionado"}.`;
  document.querySelector(".pm-palette-stock-fields")?.toggleAttribute("hidden", type !== "stock");
  document.querySelector(".pm-palette-child-fields")?.toggleAttribute("hidden", type !== "subprocess");
  const branchField = document.querySelector(".pm-palette-branch-fields");
  const branchSelect = document.getElementById("pm-palette-branch-label");
  const isDecisionChild = selected?.node_type === "decision";
  if (branchField) branchField.toggleAttribute("hidden", !isDecisionChild);
  if (branchSelect) {
    const usedLabels = new Set((state.process.transitions || [])
      .filter((edge) => String(edge.source_node_id) === String(selected?.node_id) && edge.transition_type === "branch")
      .map((edge) => String(edge.label || "")));
    branchSelect.innerHTML = `<option value="">Selecciona Sí o No</option>${["Sí", "No"].map((label) => `<option value="${label}"${usedLabels.has(label) ? " disabled" : ""}>${label}${usedLabels.has(label) ? " (ya utilizada)" : ""}</option>`).join("")}`;
    branchSelect.required = isDecisionChild;
    branchSelect.value = "";
  }
  modal.hidden = false;
  modal.classList.add("is-open");
  document.getElementById("pm-palette-name")?.focus();
}

function openInsertOperationModal() {
  if (!modelProcessId()) return message("Selecciona un proceso antes de insertar operaciones.", true);
  if (!state.selectedTransitionId) return message("Selecciona una transición antes de insertar una operación.", true);
  state.paletteModalType = "operation";
  state.paletteModalMode = "insert";
  state.editingNodeId = "";
  const modal = document.getElementById("pm-node-modal");
  const form = document.getElementById("pm-palette-node-form");
  if (!modal || !form) return;
  form.reset();
  form.elements.node_type.value = "operation";
  document.getElementById("pm-node-modal-title").textContent = "Insertar operación";
  document.getElementById("pm-node-modal-context").textContent = "La relación seleccionada se dividirá en dos relaciones sequence.";
  document.querySelector(".pm-palette-stock-fields")?.toggleAttribute("hidden", true);
  document.querySelector(".pm-palette-child-fields")?.toggleAttribute("hidden", true);
  modal.hidden = false;
  modal.classList.add("is-open");
  document.getElementById("pm-palette-name")?.focus();
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

function navigateToSelectedNodeDetail(node) {
  if (node.node_type === "subprocess" && node.child_process_id) {
    window.location.hash = `#/procesos_detalle?bpm_process_id=${encodeURIComponent(node.child_process_id)}`;
    return;
  }
  if (node.node_type === "operation") {
    window.location.hash = `#/operaciones_detalle?process_id=${encodeURIComponent(modelProcessId())}&node_id=${encodeURIComponent(node.node_id)}`;
    return;
  }
  message("Este tipo de elemento no tiene una ficha de edición dedicada.", true);
}

function editor() {
  const target = document.getElementById("pm-editor");
  if (!target) return;
  if (!state.selectedProcess && !state.process) {
    renderEditorHtml(target, '<div class="pm-empty-state"><h2>Selecciona un proceso</h2><p>Selecciona un proceso para inspeccionar su grafo.</p></div>');
    return;
  }
  const expansionStack = state.expansionStack;
  renderEditorHtml(target, renderGraph(state.process, {
    expansionStack,
    zoom: state.zoom,
    zoomControl: viewport.zoomControls(),
    fullscreenControl: viewport.fullscreenButton(),
    navigationControl: parentNavigationControl(),
  }));
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
    state.process = process.data;
    state.expansionStack = [];
    writeModelingHash(process.data.process_id);
    editor();
  } catch (error) {
    message(error.message, true);
  }
}

async function restoreFromHash() {
  const modelProcessIdValue = hashContext().get("process_id");
  if (!modelProcessIdValue) return;
  const payload = await getProcess(modelProcessIdValue);
  state.process = payload.data;
  state.selectedProcess = payload.data.process || payload.data || null;
  const expansionPath = (hashContext().get("expansion_path") || hashContext().get("node_id") || "").split(",").filter(Boolean);
  // `expansion_path` may contain a true nested path or several sibling
  // subprocesses expanded from the same root process. Restore each sibling
  // against the root instead of incorrectly looking for it inside the child
  // process expanded immediately before it.
  for (let index = 0; index < expansionPath.length; index += 1) {
    const nodeId = expansionPath[index];
    const rootNode = (state.process.nodes || []).find((node) => String(node.node_id) === String(nodeId));
    if (rootNode) {
      await expansion.expandSubprocess(nodeId, 0, modelProcessIdValue);
      continue;
    }
    const parentEntry = [...state.expansionStack].reverse().find((entry) => (entry.process?.nodes || []).some((node) => String(node.node_id) === String(nodeId)));
    if (!parentEntry) throw new Error(`No se encontró el subproceso de la ruta de expansión: ${nodeId}`);
    const parentProcess = parentEntry.process?.process_id || "";
    const parentDepth = Number(parentEntry.depth || 0) + 1;
    await expansion.expandSubprocess(nodeId, parentDepth, parentProcess);
  }
  editor();
}

async function createProcessFromForm(form) {
  const formData = new FormData(form);
  const created = (await createProcess({ name: formData.get("name") })).data;
  state.selectedProcess = created;
  state.process = created;
  form.reset();
  await load();
  editor();
  message("Proceso guardado.");
}

async function action(actionName, eventTarget) {
  try {
    if (actionName === "refresh") return load();
    if (actionName === "toggle-fullscreen") return viewport.toggleFullscreen();
    if (actionName === "zoom-in") return viewport.setZoom(state.zoom + 0.1);
    if (actionName === "zoom-out") return viewport.setZoom(state.zoom - 0.1);
    if (actionName === "zoom-fit") return viewport.fitFlow();
    if (actionName === "open-subprocess") return expansion.openSubprocessOnly(eventTarget.dataset.pmOpenNode, Number(eventTarget.dataset.pmOpenDepth || 0));
    if (actionName === "select-palette-node") return openPaletteModal(eventTarget.dataset.pmPaletteType);
    if (actionName === "insert-selected-operation") return openInsertOperationModal();
    if (actionName === "edit-selected-node") return nodeActions.editSelectedNode();
    if (actionName === "delete-selected-node") return nodeActions.deleteSelectedNode();
    if (actionName === "edit-metadata") return renderMetadataPanel(true);
    if (actionName === "cancel-metadata-edit" || actionName === "close-metadata-modal") {
      closeMetadataModal();
      return renderMetadataPanel(false);
    }
    if (actionName === "save-metadata") return saveMetadataFromForm(eventTarget.closest("form"));
    if (actionName === "close-palette-modal") return closePaletteModal();
    if (actionName === "focus-process-form") {
      document.getElementById("pm-process-name")?.focus();
      return;
    }
    if (actionName === "validate" && modelProcessId()) {
      const result = await validateProcess(modelProcessId());
      message(result.data.valid ? "Proceso válido." : "Hay errores de validación.", !result.data.valid);
      state.process.validation = result.data;
      editor();
    }
    if (actionName === "create-process") return createProcessFromForm(eventTarget.closest("form"));
    if (actionName === "create-node") return nodeActions.createNodeFromForm(eventTarget.closest("form"));
    if (actionName === "create-transition") return nodeActions.createTransitionFromForm(eventTarget.closest("form"));
    if (actionName === "create-palette-node") return nodeActions.createPaletteNodeFromForm(eventTarget.closest("form"));
    if (actionName === "expand-subprocess") {
      const nodeId = eventTarget.dataset.pmNodeId || eventTarget.closest("[data-node-id]")?.dataset.nodeId;
      const depth = Number(eventTarget.closest("[data-pm-expansion-depth]")?.dataset.pmExpansionDepth || 0);
      const parentProcessId = eventTarget.closest("[data-pm-parent-process-id]")?.dataset.pmParentProcessId || "";
      return await expansion.expandSubprocess(nodeId, depth, parentProcessId);
    }
    if (actionName === "collapse-subprocess") return expansion.collapseSubprocess(eventTarget.dataset.pmCollapseNode || "");
  } catch (error) {
    message(error.message, true);
  }
}

export function renderProcessModeling() {
  const main = document.createElement("div");
  main.innerHTML = shell();
  main.querySelector(".pm-process-form")?.insertAdjacentHTML("afterend", '<form id="pm-transition-form" class="pm-form pm-transition-form"><label for="pm-transition-source">Origen</label><select id="pm-transition-source" name="source_node_id" required><option value="">Selecciona una operación</option></select><label for="pm-transition-target">Destino</label><select id="pm-transition-target" name="target_node_id" required><option value="">Selecciona una operación</option></select><input type="hidden" name="transition_type" value="sequence"><button class="pm-secondary" type="submit" data-pm-action="create-transition">Conectar operaciones</button></form>');
  main.querySelector(".pm-layout")?.insertAdjacentHTML("beforeend", metadataPanelShell());
  return {
    main,
    afterMount: async () => {
      const onResize = () => viewport.scheduleRelayout();
      // The graph can become visible before the asynchronous catalog/process
      // loading finishes. Bind metadata actions up front so the right panel
      // cannot expose a form before its save/cancel handlers exist.
      main.addEventListener("input", (event) => {
        if (!event.target.matches("[data-metadata-additional-title], [data-metadata-additional-description]")) return;
        const saveButton = event.target.closest("[data-metadata-additional-field]")?.querySelector("[data-pm-action=save-metadata-field]");
        if (!saveButton) return;
        saveButton.dataset.metadataFieldSaved = "false";
        saveButton.setAttribute("aria-pressed", "false");
      });
      const onFullscreenChange = () => {
        if (document.fullscreenElement || state.fullscreenMode !== "native") return;
        state.fullscreen = false;
        state.fullscreenMode = null;
        viewport.updateFullscreenDom();
        viewport.focusFullscreenControl();
        viewport.scheduleRelayout();
      };
      await load();
      await restoreFromHash().catch((error) => { message(error.message, true); editor(); });
      syncProcessSelector();
      editor();
      renderMetadataPanel();
      main.addEventListener("submit", (event) => {
        event.preventDefault();
        if (event.target.id === "pm-metadata-form") {
          void saveMetadataFromForm(event.target).catch((error) => message(error.message, true));
          return;
        }
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
        const metadataAction = event.target.closest("[data-pm-action]");
        if (metadataAction) {
          const metadataName = metadataAction.dataset.pmAction;
          if (metadataName === "edit-metadata") return renderMetadataPanel(true);
          if (metadataName === "add-metadata-field") return addMetadataField(metadataAction.closest("form"));
          if (metadataName === "save-metadata-field") return saveMetadataField(metadataAction);
          if (metadataName === "remove-metadata-field") return removeMetadataField(metadataAction);
          if (metadataName === "cancel-metadata-edit" || metadataName === "close-metadata-modal") {
            closeMetadataModal();
            return renderMetadataPanel(false);
          }
        }
        const transition = event.target.closest("[data-pm-action='select-transition']");
        if (transition) {
          state.selectedTransitionId = transition.dataset.pmTransitionId || "";
          updateNodeSelection();
          return;
        }
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
        if (actionable && !["create-process", "create-node", "create-transition", "edit-metadata", "cancel-metadata-edit", "close-metadata-modal", "save-metadata", "add-metadata-field", "save-metadata-field", "remove-metadata-field"].includes(actionable.dataset.pmAction)) {
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
          if (!document.querySelector(".pm-flow-scroll")) viewport.scheduleRelayout();
        }).catch(() => {});
      }
      document.fonts?.addEventListener?.("loadingdone", () => {
        if (!document.querySelector(".pm-flow-scroll")) onResize();
      });
    },
  };
}
