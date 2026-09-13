const STORAGE_KEY = "uc-bib-industrial-flow-studio-v1";
const TYPE_META = {
  start: { label: "Evento de inicio", icon: "play_arrow", defaultName: "Proceso iniciado" },
  end: { label: "Evento de fin", icon: "stop", defaultName: "Proceso completado" },
  machine: { label: "Operación de máquina", icon: "precision_manufacturing", defaultName: "Nueva operación de máquina" },
  manual: { label: "Operación manual", icon: "front_hand", defaultName: "Nueva operación manual" },
  inspection: { label: "Inspección", icon: "manage_search", defaultName: "Nueva inspección" },
  verification: { label: "Verificación", icon: "task_alt", defaultName: "Nueva verificación" },
  stock: { label: "Stock / buffer", icon: "inventory_2", defaultName: "Nuevo stock intermedio" },
  decision: { label: "Decisión", icon: "alt_route", defaultName: "¿Se cumple la condición?" },
  subprocess: { label: "Subproceso", icon: "account_tree", defaultName: "Nuevo subproceso" },
};

const seed = {
  process: {
    id: "process-preparation-packaging",
    code: "PROC-001",
    name: "Preparación y envasado de producto",
    status: "draft",
    revision: 4,
    semantics: { domain: "industrial_process", direction: "left_to_right", layout: "derived" },
  },
  nodes: [
    { id: "n-start", code: "EVT-01", type: "start", name: "Orden liberada", description: "Orden de fabricación aprobada y lista para ejecutar", owner: "Planificación", duration: 0 },
    { id: "n-stock", code: "STK-01", type: "stock", name: "Materia prima disponible", description: "Buffer de entrada de materia prima", owner: "Almacén", capacity: 500, unit: "kg", duration: 0 },
    { id: "n-machine", code: "OPM-01", type: "machine", name: "Mezclar componentes", description: "Ejecutar receta RCP-042 en mezcladora MX-03", owner: "Producción", resource: "MX-03", duration: 18 },
    { id: "n-inspect", code: "INS-01", type: "inspection", name: "Inspeccionar viscosidad", description: "Muestreo según plan PC-08; rango objetivo 340–380 cP", owner: "Calidad", criterion: "340–380 cP", duration: 6 },
    { id: "n-decision", code: "GW-01", type: "decision", name: "¿Viscosidad conforme?", description: "Evalúa el resultado de INS-01", owner: "Calidad", duration: 0 },
    { id: "n-manual", code: "OPH-01", type: "manual", name: "Ajustar formulación", description: "Añadir corrector y homogeneizar durante 3 minutos", owner: "Operario de línea", duration: 5 },
    { id: "n-package", code: "OPM-02", type: "machine", name: "Envasar y sellar", description: "Llenado volumétrico y sellado automático", owner: "Producción", resource: "ENV-07", duration: 12 },
    { id: "n-verify", code: "VER-01", type: "verification", name: "Verificar lote y etiquetado", description: "Confirmar lote, caducidad y legibilidad del etiquetado", owner: "Calidad", criterion: "100% conforme", duration: 4 },
    { id: "n-end", code: "EVT-02", type: "end", name: "Lote listo para expedición", description: "Producto liberado al almacén de terminado", owner: "Logística", duration: 0 },
  ],
  edges: [
    { id: "e1", source: "n-start", target: "n-stock", type: "sequence", label: "" },
    { id: "e2", source: "n-stock", target: "n-machine", type: "material_flow", label: "Materia prima" },
    { id: "e3", source: "n-machine", target: "n-inspect", type: "sequence", label: "" },
    { id: "e4", source: "n-inspect", target: "n-decision", type: "evidence", label: "Resultado" },
    { id: "e5", source: "n-decision", target: "n-package", type: "branch", label: "Sí" },
    { id: "e6", source: "n-decision", target: "n-manual", type: "branch", label: "No" },
    { id: "e7", source: "n-manual", target: "n-inspect", type: "rework", label: "Reinspeccionar" },
    { id: "e8", source: "n-package", target: "n-verify", type: "sequence", label: "" },
    { id: "e9", source: "n-verify", target: "n-end", type: "sequence", label: "Liberado" },
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

let model = clone(seed);
let selected = null;
let selectedNodeIds = new Set();
let zoom = 1;
let history = [];
let future = [];
let currentView = "design";
let activeTool = "select";
let panStart = null;
let saveTimer = null;
let positions = {};
let manualPositions = {};
let layoutDirty = false;
let pendingLegacyLayout = null;
let connectionSource = null;
let processCatalog = [];
let databaseMode = false;
let liveProcessId = null;
let layoutPersistenceAvailable = false;
let layoutLoadError = null;
let navigationStack = [];
let inspectorTab = "details";
const nodeContextCache = new Map();
const dirtyNodeIds = new Set();
const dirtyEdgeIds = new Set();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const nodeById = (id) => model.nodes.find((node) => node.id === id);
const edgeById = (id) => model.edges.find((edge) => edge.id === id);

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let payload = null;
  try { payload = await response.json(); } catch { /* Keep the HTTP fallback below. */ }
  if (!response.ok) {
    const error = new Error(payload?.message || `Error HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload?.code || null;
    throw error;
  }
  return payload?.status === "ok" && Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
}

async function loadOptionalProcessLayout(processId) {
  try {
    const layout = await api(`/api/bpm/processes/${encodeURIComponent(processId)}/layout`);
    if (!layout || !Array.isArray(layout.positions)) throw new Error("La respuesta del layout no contiene posiciones válidas");
    return { available: true, positions: layout.positions, error: null };
  } catch (error) {
    return { available: false, positions: [], error };
  }
}

function renderDatabaseStatus() {
  const status = $("#database-status");
  status.classList.remove("is-offline", "is-degraded");
  if (layoutPersistenceAvailable) {
    status.innerHTML = "<i></i> Base de datos";
    status.title = "Grafo y disposición visual compartida cargados desde PostgreSQL";
    return;
  }
  status.classList.add("is-degraded");
  status.innerHTML = "<i></i> BD · diseño automático";
  status.title = `El proceso está cargado desde la base de datos. El layout compartido no está disponible: ${layoutLoadError?.message || "error desconocido"}`;
}

function inferIndustrialType(node) {
  const properties = node.properties || {};
  const declared = properties.industrial_kind || properties.studio?.industrial_kind;
  if (TYPE_META[declared]) return declared;
  if (node.node_type === "input") return "start";
  if (node.node_type === "output") return "end";
  if (["stock", "decision", "subprocess"].includes(node.node_type)) return node.node_type;
  const detail = node.metadata?.data || node.metadata || {};
  const text = `${node.name || ""} ${node.description || ""}`.toLowerCase();
  if (/inspecci|muestreo|control de calidad|analiz/.test(text)) return "inspection";
  if (/verific|confirm|valid/.test(text)) return "verification";
  if (/manual|operario|manipul/.test(text)) return "manual";
  if ((detail.equipment || properties.equipment || []).length || /máquina|maquina|mezcl|dosific|sold|pesad|inyecci/.test(text)) return "machine";
  return "manual";
}

function firstUseful(value, fallback = "") {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => {
    if (!item || typeof item !== "object") return item;
    const title = item.name || item.nombre || item.title || item.titulo || item.label || item.machine_ref;
    const description = item.description || item.descripcion || item.detail || item.detalle;
    return [title, description].filter(Boolean).join(" — ") || Object.keys(item).join(", ");
  }).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value ?? fallback;
}

function mapDatabaseProcess(payload) {
  const nodes = (payload.nodes || []).map((node) => {
    const properties = node.properties || {};
    const detail = node.metadata?.data || node.metadata || {};
    const studio = properties.studio || {};
    const stock = properties.stock || {};
    return {
      id: String(node.node_id),
      code: node.node_code,
      type: inferIndustrialType(node),
      name: node.name,
      description: node.description || detail.description || detail.detailed_description || "",
      owner: studio.owner || firstUseful(detail.personnel || detail.responsible || ""),
      resource: studio.resource || firstUseful(detail.equipment || properties.equipment || ""),
      criterion: studio.criterion || firstUseful(detail.acceptance_criteria || detail.quality_controls || ""),
      duration: Number(studio.duration || detail.duration_minutes || 0),
      capacity: Number(stock.capacity ?? node.stock_capacity ?? 0),
      initialQuantity: Number(stock.initial_quantity ?? node.stock_initial_quantity ?? 0),
      unit: stock.unit || node.stock_unit || "u",
      childProcessId: node.child_process_id || null,
      outputRole: node.output_role || null,
      _properties: clone(properties),
      _metadata: clone(node.metadata || {}),
      _persisted: true,
    };
  });
  const edges = (payload.diagram_transitions || payload.transitions || []).map((edge) => ({
    id: String(edge.transition_id),
    source: String(edge.source_node_id),
    target: String(edge.target_node_id),
    type: edge.properties?.semantic_relation_kind || edge.transition_type || "sequence",
    label: edge.label || "",
    condition: edge.condition || "",
    _properties: clone(edge.properties || {}),
    _persisted: true,
  }));
  return {
    process: {
      id: String(payload.process_id), code: payload.process_code, name: payload.name,
      description: payload.description || "", status: payload.status, revision: 0,
      semantics: { domain: "industrial_process", direction: "left_to_right", layout: "derived" },
    },
    nodes,
    edges,
  };
}

function canonicalNodePayload(node) {
  const canonicalType = node.type === "start" ? "input" : node.type === "end" ? "output"
    : ["machine", "manual", "inspection", "verification"].includes(node.type) ? "operation" : node.type;
  const properties = {
    ...(node._properties || {}),
    industrial_kind: node.type,
    studio: {
      ...((node._properties || {}).studio || {}),
      industrial_kind: node.type,
      owner: node.owner || "",
      resource: node.resource || "",
      criterion: node.criterion || "",
      duration: Number(node.duration || 0),
    },
  };
  if (canonicalType === "stock") {
    const capacity = Math.max(1, Number(node.capacity || 1));
    properties.stock = { capacity, initial_quantity: Math.min(capacity, Math.max(0, Number(node.initialQuantity || 0))), unit: node.unit || "u" };
  }
  return {
    node_type: canonicalType,
    name: node.name || TYPE_META[node.type].defaultName,
    description: node.description || null,
    child_process_id: canonicalType === "subprocess" ? node.childProcessId : null,
    output_role: canonicalType === "output" ? (node.outputRole || "normal") : null,
    properties,
  };
}

function canonicalEdgePayload(edge) {
  const transitionType = edge.type === "branch" ? "branch" : "sequence";
  return {
    source_node_id: edge.source,
    target_node_id: edge.target,
    transition_type: transitionType,
    label: edge.label || null,
    condition: edge.condition || null,
    properties: { ...(edge._properties || {}), semantic_relation_kind: edge.type },
  };
}

function positionStorageKey(processId = liveProcessId || model.process.id) {
  return `${STORAGE_KEY}:positions:${processId}`;
}

function canonicalLayoutPositions(source = manualPositions) {
  const knownNodeIds = new Set(model.nodes.map((node) => String(node.id)));
  return Object.entries(source || {}).flatMap(([nodeId, position]) => {
    const x = Number(position?.x);
    const y = Number(position?.y);
    if (!knownNodeIds.has(String(nodeId)) || !Number.isFinite(x) || !Number.isFinite(y)) return [];
    if (x < -1000000 || x > 1000000 || y < -1000000 || y > 1000000) return [];
    return [{ node_id: String(nodeId), x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }];
  });
}

function applyLayoutPositions(items = []) {
  manualPositions = Object.fromEntries(items.map((item) => [String(item.node_id), { x: Number(item.x), y: Number(item.y) }]));
}

function archiveLegacyLayout(raw) {
  const key = positionStorageKey();
  try {
    localStorage.setItem(`${key}:backup`, JSON.stringify({ archived_at: new Date().toISOString(), value: raw }));
    localStorage.removeItem(key);
  } catch { /* The server remains authoritative even if local cleanup is unavailable. */ }
}

function offerLegacyLayoutMigration() {
  pendingLegacyLayout = null;
  if (!databaseMode || !layoutPersistenceAvailable || canonicalLayoutPositions().length) return;
  let raw;
  let parsed;
  try {
    raw = localStorage.getItem(positionStorageKey());
    if (!raw) return;
    parsed = JSON.parse(raw);
  } catch {
    toast("La disposición local anterior no es válida y no se importará", "warning");
    return;
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return;
  const total = Object.keys(parsed).length;
  const positions = canonicalLayoutPositions(parsed);
  if (!positions.length) return;
  pendingLegacyLayout = { raw, positions, discarded: total - positions.length };
  $("#layout-migration-summary").textContent = `${positions.length} posiciones válidas${pendingLegacyLayout.discarded ? ` · ${pendingLegacyLayout.discarded} referencias antiguas se descartarán` : ""}.`;
  $("#layout-migration-dialog").showModal();
}

async function importLegacyLayout() {
  if (!pendingLegacyLayout || !databaseMode || !layoutPersistenceAvailable) return;
  const migration = pendingLegacyLayout;
  try {
    const result = await api(`/api/bpm/processes/${encodeURIComponent(liveProcessId)}/layout`, {
      method: "PUT", body: JSON.stringify({ positions: migration.positions }),
    });
    applyLayoutPositions(result.positions || []);
    layoutDirty = false;
    archiveLegacyLayout(migration.raw);
    pendingLegacyLayout = null;
    $("#layout-migration-dialog").close();
    render();
    toast("Disposición importada y compartida desde PostgreSQL", "cloud_done");
  } catch (error) {
    toast(`No se pudo importar la disposición: ${error.message}`, "error");
  }
}

function ignoreLegacyLayout() {
  if (pendingLegacyLayout) archiveLegacyLayout(pendingLegacyLayout.raw);
  pendingLegacyLayout = null;
  $("#layout-migration-dialog").close();
  toast("Se usará el diseño automático compartido", "auto_awesome_motion");
}

async function loadDatabaseProcess(processId, { announce = true } = {}) {
  const [payload, layout] = await Promise.all([
    api(`/api/bpm/processes/${encodeURIComponent(processId)}`),
    loadOptionalProcessLayout(processId),
  ]);
  model = mapDatabaseProcess(payload);
  liveProcessId = String(processId);
  databaseMode = true;
  selected = null;
  selectedNodeIds.clear();
  inspectorTab = "details";
  nodeContextCache.clear();
  connectionSource = null;
  history = [];
  future = [];
  dirtyNodeIds.clear();
  dirtyEdgeIds.clear();
  layoutPersistenceAvailable = layout.available;
  layoutLoadError = layout.error;
  applyLayoutPositions(layout.positions);
  layoutDirty = false;
  renderDatabaseStatus();
  $("#db-process-selector").value = liveProcessId;
  render();
  setTimeout(fit, 30);
  setTimeout(() => {
    if (String(liveProcessId) === String(processId)) offerLegacyLayoutMigration();
  }, 0);
  if (layoutLoadError) toast(`Proceso cargado. Se usa diseño automático porque el layout compartido falló: ${layoutLoadError.message}`, "warning");
  if (announce) toast(`Proceso cargado: ${payload.name}`, "database");
}

async function initializeDatabase() {
  if (location.protocol === "file:") {
    $("#database-status").classList.add("is-offline");
    $("#database-status").innerHTML = "<i></i> Modo local";
    $("#db-process-selector").innerHTML = '<option value="">Ejemplo local</option>';
    return;
  }
  try {
    processCatalog = await api("/api/bpm/processes");
    const selector = $("#db-process-selector");
    selector.innerHTML = processCatalog.map((process) => `<option value="${esc(process.process_id)}">${esc(process.name)}</option>`).join("");
    const query = new URLSearchParams(location.search);
    const requested = query.get("processId");
    navigationStack = (query.get("trail") || "").split(",").filter(Boolean).map((processId) => {
      const process = processCatalog.find((item) => String(item.process_id) === String(processId));
      return process ? { processId: String(process.process_id), name: process.name, code: process.process_code } : null;
    }).filter(Boolean);
    const firstId = processCatalog.some((item) => String(item.process_id) === String(requested)) ? requested : processCatalog[0]?.process_id;
    if (firstId) {
      await loadDatabaseProcess(firstId, { announce: false });
      const requestedNodeId = query.get("selectedNodeId") || query.get("node_id");
      if (requestedNodeId && nodeById(requestedNodeId)) {
        selected = { kind: "node", id: String(requestedNodeId) };
        selectedNodeIds = new Set([String(requestedNodeId)]);
        render();
      }
      if (query.get("new") === "1") setTimeout(() => openCreateProcessDialog(), 0);
    }
    else throw new Error("No hay procesos BPM almacenados");
  } catch (error) {
    databaseMode = false;
    layoutPersistenceAvailable = false;
    layoutLoadError = null;
    $("#database-status").classList.add("is-offline");
    $("#database-status").classList.remove("is-degraded");
    $("#database-status").innerHTML = "<i></i> Modo local";
    $("#database-status").title = `No se pudo cargar el catálogo o el proceso BPM: ${error.message}`;
    $("#db-process-selector").innerHTML = '<option value="">Ejemplo local</option>';
    toast(`No se pudo leer la base de datos: ${error.message}`, "cloud_off");
  }
}

function snapshot() {
  history.push(clone(model));
  if (history.length > 50) history.shift();
  future = [];
}

function markChanged() {
  $("#save-label").textContent = "Cambios sin guardar";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(false), 1800);
}

function markLayoutChanged() {
  layoutDirty = true;
  markChanged();
}

async function flushPendingChanges() {
  if (!databaseMode || (!saveTimer && !layoutDirty && !dirtyNodeIds.size && !dirtyEdgeIds.size)) return true;
  return save(false);
}

function toast(message, icon = "check_circle") {
  const item = document.createElement("div");
  item.className = "toast";
  item.innerHTML = `<span class="material-symbols-rounded">${icon}</span><span>${esc(message)}</span>`;
  $("#toast-region").append(item);
  setTimeout(() => item.remove(), 2800);
}

function graphDepths() {
  const depth = Object.fromEntries(model.nodes.map((node) => [node.id, 0]));
  const incoming = Object.fromEntries(model.nodes.map((node) => [node.id, 0]));
  const forwardEdges = model.edges.filter((edge) => edge.type !== "rework");
  forwardEdges.forEach((edge) => { if (incoming[edge.target] !== undefined) incoming[edge.target] += 1; });
  const queue = model.nodes.filter((node) => incoming[node.id] === 0).map((node) => node.id);
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    forwardEdges.filter((edge) => edge.source === id).forEach((edge) => {
      depth[edge.target] = Math.max(depth[edge.target] || 0, (depth[id] || 0) + 1);
      incoming[edge.target] -= 1;
      if (incoming[edge.target] <= 0) queue.push(edge.target);
    });
  }
  model.nodes.filter((node) => !seen.has(node.id)).forEach((node, index) => { depth[node.id] = Math.max(depth[node.id], index + 1); });
  return depth;
}

function layoutGraph() {
  const depths = graphDepths();
  const lanes = {};
  model.nodes.forEach((node) => {
    const d = depths[node.id] || 0;
    if (!lanes[d]) lanes[d] = [];
    lanes[d].push(node);
  });
  const result = {};
  Object.entries(lanes).forEach(([depth, nodes]) => {
    const ordered = [...nodes].sort((a, b) => {
      const incomingA = model.edges.find((edge) => edge.target === a.id && edge.type === "branch");
      const incomingB = model.edges.find((edge) => edge.target === b.id && edge.type === "branch");
      const rank = (edge) => edge?.label?.toLowerCase() === "sí" ? 0 : edge?.label?.toLowerCase() === "no" ? 1 : 2;
      return rank(incomingA) - rank(incomingB) || a.code.localeCompare(b.code);
    });
    const spacing = 138;
    const startY = 260 - ((ordered.length - 1) * spacing) / 2;
    ordered.forEach((node, index) => {
      const eventOffset = ["start", "end"].includes(node.type) ? 55 : node.type === "decision" ? 38 : 0;
      result[node.id] = { x: 75 + Number(depth) * 230 + eventOffset, y: startY + index * spacing };
    });
  });
  Object.entries(manualPositions).forEach(([nodeId, position]) => {
    if (result[nodeId]) result[nodeId] = { ...position };
  });
  return result;
}

function nodeSize(node) {
  if (["start", "end"].includes(node.type)) return { width: 62, height: 62 };
  if (node.type === "decision") return { width: 84, height: 84 };
  return { width: 172, height: 88 };
}

function center(node, side) {
  const pos = positions[node.id] || { x: 0, y: 0 };
  const size = nodeSize(node);
  if (side === "left") return { x: pos.x, y: pos.y + size.height / 2 };
  if (side === "right") return { x: pos.x + size.width, y: pos.y + size.height / 2 };
  return { x: pos.x + size.width / 2, y: pos.y + size.height / 2 };
}

function routeFor(edge) {
  const sourceNode = nodeById(edge.source);
  const targetNode = nodeById(edge.target);
  if (!sourceNode || !targetNode) return null;
  const source = center(sourceNode, "right");
  const target = center(targetNode, "left");
  if (edge.type === "rework" || target.x <= source.x) {
    const sourceBox = positions[sourceNode.id];
    const targetBox = positions[targetNode.id];
    const loopY = Math.max(sourceBox.y + nodeSize(sourceNode).height, targetBox.y + nodeSize(targetNode).height) + 58;
    return { path: `M ${source.x} ${source.y} C ${source.x + 46} ${source.y}, ${source.x + 35} ${loopY}, ${source.x - 12} ${loopY} L ${target.x - 34} ${loopY} C ${target.x - 58} ${loopY}, ${target.x - 48} ${target.y}, ${target.x} ${target.y}`, labelX: (source.x + target.x) / 2, labelY: loopY - 7, addX: (source.x + target.x) / 2, addY: loopY };
  }
  const midX = (source.x + target.x) / 2;
  return { path: `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`, labelX: midX, labelY: (source.y + target.y) / 2 - 8, addX: midX, addY: (source.y + target.y) / 2 };
}

function renderEdges() {
  const svg = $("#edge-layer");
  svg.querySelectorAll(".edge-group").forEach((group) => group.remove());
  model.edges.forEach((edge) => {
    const route = routeFor(edge);
    if (!route) return;
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", `edge-group${selected?.kind === "edge" && selected.id === edge.id ? " is-selected" : ""}`);
    group.dataset.edgeId = edge.id;
    const label = edge.label ? `<rect class="edge-label-bg" x="${route.labelX - Math.max(17, edge.label.length * 3.2)}" y="${route.labelY - 11}" width="${Math.max(34, edge.label.length * 6.4)}" height="17" rx="8"/><text class="edge-label" x="${route.labelX}" y="${route.labelY + 1}" text-anchor="middle">${esc(edge.label)}</text>` : "";
    group.innerHTML = `<path class="edge-hit" d="${route.path}"/><path class="edge-path" d="${route.path}"/>${label}<g class="edge-add" data-insert-edge="${esc(edge.id)}" transform="translate(${route.addX} ${route.addY})"><circle r="10"/><text x="0" y="6" text-anchor="middle">+</text></g>`;
    svg.append(group);
  });
}

function nodeMarkup(node) {
  const meta = TYPE_META[node.type] || TYPE_META.machine;
  const selectedClass = selectedNodeIds.has(node.id) ? " is-selected" : "";
  const primaryClass = selected?.kind === "node" && selected.id === node.id ? " is-primary-selected" : "";
  const connectClass = connectionSource === node.id ? " is-connect-source" : "";
  const search = $("#node-search").value.trim().toLowerCase();
  const match = search && `${node.name} ${node.description} ${node.code} ${meta.label}`.toLowerCase().includes(search);
  const searchClass = search ? (match ? " is-match" : " is-muted") : "";
  const pos = positions[node.id];
  if (["start", "end"].includes(node.type)) {
    return `<article class="flow-node event-node ${node.type}${selectedClass}${primaryClass}${connectClass}${searchClass}" draggable="true" data-node-id="${esc(node.id)}" style="left:${pos.x}px;top:${pos.y}px" tabindex="0" aria-label="${esc(meta.label)}: ${esc(node.name)}"><span class="material-symbols-rounded">${meta.icon}</span><span class="event-label">${esc(node.name)}</span><span class="node-code-label">${esc(node.code)}</span><button class="node-port" draggable="true" data-connect-from="${esc(node.id)}" title="Arrastra para conectar" aria-label="Conectar desde ${esc(node.name)}"></button></article>`;
  }
  if (node.type === "decision") {
    return `<article class="flow-node decision-node${selectedClass}${primaryClass}${connectClass}${searchClass}" draggable="true" data-node-id="${esc(node.id)}" style="left:${pos.x}px;top:${pos.y}px" tabindex="0" aria-label="Decisión: ${esc(node.name)}"><div class="decision-content"><span class="material-symbols-rounded">${meta.icon}</span><strong>${esc(node.name)}</strong></div><span class="node-code-label">${esc(node.code)}</span><button class="node-port" draggable="true" data-connect-from="${esc(node.id)}" title="Arrastra para conectar" aria-label="Conectar desde ${esc(node.name)}"></button></article>`;
  }
  const footer = node.type === "stock"
    ? `<span class="metric-tag"><span class="material-symbols-rounded">inventory</span>${esc(node.capacity || 0)} ${esc(node.unit || "u")}</span>`
    : `<span class="metric-tag"><span class="material-symbols-rounded">schedule</span>${esc(node.duration || 0)} min</span>`;
  const footerDetail = node.type === "subprocess"
    ? `<button class="subprocess-link" data-open-subprocess="${esc(node.id)}" ${node.childProcessId ? "" : "disabled"} title="${node.childProcessId ? "Abrir el grafo de este subproceso" : "Subproceso todavía no vinculado"}"><span class="material-symbols-rounded">account_tree</span>${node.childProcessId ? "Abrir" : "Sin vincular"}</button>`
    : `<span>${esc(node.owner || "Sin asignar")}</span>`;
  return `<article class="flow-node task-node type-${esc(node.type)}${selectedClass}${primaryClass}${connectClass}${searchClass}" draggable="true" data-node-id="${esc(node.id)}" style="left:${pos.x}px;top:${pos.y}px" tabindex="0" aria-label="${esc(meta.label)}: ${esc(node.name)}"><div class="task-content"><span class="task-kicker"><span class="material-symbols-rounded">${meta.icon}</span>${esc(meta.label)}</span><strong>${esc(node.name)}</strong><small>${esc(node.description || "Sin descripción")}</small></div><div class="task-footer">${footer}${footerDetail}</div><span class="node-code-label">${esc(node.code)}</span><button class="node-port" draggable="true" data-connect-from="${esc(node.id)}" title="Arrastra para conectar" aria-label="Conectar desde ${esc(node.name)}"></button></article>`;
}

function renderMinimap() {
  const target = $("#minimap-content");
  target.innerHTML = model.nodes.map((node) => {
    const pos = positions[node.id];
    return `<i class="mini-node ${node.type === "decision" ? "decision" : ""}" style="left:${6 + pos.x / 10}px;top:${8 + pos.y / 10}px;width:${Math.max(5, nodeSize(node).width / 10)}px"></i>`;
  }).join("");
}

function renderSummary() {
  $("#process-title").value = model.process.name;
  $("#process-code").textContent = model.process.code;
  const breadcrumb = navigationStack.map((item) => item.name).join(" / ") || "Procesos";
  $("#process-path").textContent = breadcrumb;
  $("#process-path").title = [...navigationStack.map((item) => item.name), model.process.name].join(" / ");
  $("#process-back").hidden = navigationStack.length === 0;
  $("#process-summary").textContent = `${model.nodes.length} elementos · ${model.edges.length} relaciones`;
  $("#selection-status").textContent = selectedNodeIds.size > 1 ? `${selectedNodeIds.size} elementos seleccionados` : selected ? `${selected.kind === "node" ? "Elemento" : "Relación"} seleccionado` : "Sin selección";
  const toolbar = $("#selection-toolbar");
  toolbar.hidden = selectedNodeIds.size < 2;
  $("#selection-count").textContent = `${selectedNodeIds.size} seleccionados`;
}

function render() {
  positions = layoutGraph();
  const surface = $("#canvas-surface");
  const requiredWidth = Math.max(1350, ...model.nodes.map((node) => (positions[node.id]?.x || 0) + nodeSize(node).width + 180));
  const requiredHeight = Math.max(760, ...model.nodes.map((node) => (positions[node.id]?.y || 0) + nodeSize(node).height + 180));
  surface.style.width = `${Math.ceil(requiredWidth)}px`;
  surface.style.height = `${Math.ceil(requiredHeight)}px`;
  $("#nodes-layer").innerHTML = model.nodes.map(nodeMarkup).join("");
  renderEdges();
  renderMinimap();
  renderSummary();
  renderInspector();
  updateZoom();
  renderView();
}

function connectionMarkup(node) {
  const outgoing = model.edges.filter((edge) => edge.source === node.id);
  const incoming = model.edges.filter((edge) => edge.target === node.id);
  if (!incoming.length && !outgoing.length) return '<p class="panel-help">Este elemento aún no tiene relaciones.</p>';
  return [...incoming.map((edge) => ({ edge, direction: "arrow_back", other: nodeById(edge.source) })), ...outgoing.map((edge) => ({ edge, direction: "arrow_forward", other: nodeById(edge.target) }))]
    .map(({ edge, direction, other }) => `<button class="connection-item" data-select-edge="${esc(edge.id)}"><span class="material-symbols-rounded">${direction}</span><span>${esc(other?.name || "Elemento eliminado")}</span><small>${esc(edge.label || edge.type)}</small></button>`).join("");
}

function contextSource(node) {
  const metadata = node._metadata || {};
  return metadata.data && typeof metadata.data === "object" ? metadata.data : metadata;
}

function asList(value) {
  if (value === null || value === undefined || value === "") return [];
  return (Array.isArray(value) ? value : [value]).filter((item) => item !== null && item !== undefined && item !== "");
}

function contextChips(value, emptyLabel = "Sin información vinculada") {
  const items = asList(value);
  if (!items.length) return `<span class="context-empty-inline">${esc(emptyLabel)}</span>`;
  return `<div class="context-chips">${items.map((item) => `<span>${esc(typeof item === "object" ? item.name || item.nombre || JSON.stringify(item) : item)}</span>`).join("")}</div>`;
}

function contextBullets(value, emptyLabel = "No documentado") {
  const items = asList(value);
  if (!items.length) return `<p class="context-empty-inline">${esc(emptyLabel)}</p>`;
  return `<ul class="context-list">${items.map((item) => `<li>${esc(typeof item === "object" ? item.name || item.nombre || item.description || JSON.stringify(item) : item)}</li>`).join("")}</ul>`;
}

function contextCompleteness(node, bundle = null) {
  const raw = contextSource(node);
  const detail = bundle?.detail || raw;
  const checks = [
    node.description || detail.description,
    detail.objective || raw.objective,
    asList(detail.inputs || raw.inputs).length,
    asList(detail.outputs || raw.outputs).length,
    asList(bundle?.machines).length || asList(raw.equipment).length,
    bundle?.contract || raw.canonical_ids?.contract_id || raw.canonical_ids?.contrato_id,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

async function loadNodeContext(node) {
  if (!databaseMode || !liveProcessId || nodeContextCache.get(node.id)?.status === "loading") return;
  const raw = contextSource(node);
  const canonical = raw.canonical_ids || node._properties?.canonical_ids || {};
  const contractId = canonical.contract_id ?? canonical.contrato_id;
  nodeContextCache.set(node.id, { status: "loading" });
  if (selected?.id === node.id && inspectorTab === "context") renderInspector();
  const requests = [
    api(`/api/bpm/processes/${encodeURIComponent(liveProcessId)}/context?node_id=${encodeURIComponent(node.id)}`),
    api(`/api/bpm/machines?operationId=${encodeURIComponent(node.id)}`),
    contractId ? api(`/api/bpm/contracts/${encodeURIComponent(contractId)}`) : Promise.resolve(null),
  ];
  const [contextResult, machinesResult, contractResult] = await Promise.allSettled(requests);
  const contextPayload = contextResult.status === "fulfilled" ? contextResult.value : null;
  const detail = contextPayload?.details?.[0]?.context_detail || raw;
  const machines = machinesResult.status === "fulfilled" && Array.isArray(machinesResult.value) ? machinesResult.value : [];
  const contract = contractResult.status === "fulfilled" ? contractResult.value : null;
  const failures = [contextResult, machinesResult, contractResult].filter((result) => result.status === "rejected");
  nodeContextCache.set(node.id, { status: failures.length === 3 ? "error" : "ready", detail, machines, contract, records: contextPayload?.records || [], error: failures[0]?.reason?.message });
  if (selected?.id === node.id && inspectorTab === "context") renderInspector();
}

function renderContextTab(node) {
  const raw = contextSource(node);
  let bundle = nodeContextCache.get(node.id);
  if (!bundle && databaseMode) {
    setTimeout(() => loadNodeContext(node), 0);
    bundle = { status: "loading" };
  }
  if (!bundle && !databaseMode) bundle = { status: "ready", detail: raw, machines: [], contract: null, records: [] };
  if (bundle.status === "loading") return `<div class="context-loading"><span class="context-spinner"></span><strong>Construyendo contexto de negocio</strong><p>Consultando operación, proceso, máquinas y contratos relacionados…</p></div>`;
  const detail = bundle.detail || raw;
  const additional = detail.additional?.data || detail.additional || {};
  const machines = bundle.machines || [];
  const equipment = machines.length ? machines.map((machine) => machine.name) : additional.equipment || raw.equipment;
  const controls = detail.controls || additional.quality_controls || raw.quality_controls;
  const parameters = detail.parameters || additional.parameters || raw.parameters;
  const objective = detail.objective || additional.objective || raw.objective;
  const inputs = detail.inputs || additional.inputs || raw.inputs;
  const outputs = detail.outputs || additional.outputs || raw.outputs;
  const questions = additional.open_questions || raw.open_questions;
  const contract = bundle.contract;
  const source = node._metadata?.source || detail.additional?.source || {};
  const provenance = node._metadata?.provenance || detail.additional?.provenance || {};
  const machineCards = machines.length
    ? machines.map((machine) => `<button class="linked-entity" data-open-machine-detail="${esc(machine.id)}" title="Abrir ficha completa de ${esc(machine.name)}"><span class="linked-icon material-symbols-rounded">precision_manufacturing</span><div><strong>${esc(machine.name)}</strong><small>${esc(machine.area || "Área no definida")}</small></div><span class="entity-id">M-${esc(machine.id)}</span><span class="entity-open material-symbols-rounded">open_in_new</span></button>`).join("")
    : contextChips(equipment, "Sin máquinas vinculadas");
  const contractMarkup = contract
    ? `<article class="contract-card"><div class="contract-card-head"><span class="linked-icon material-symbols-rounded">contract</span><div><small>Contrato ${esc(contract.id)}</small><strong>${esc(contract.nombre || contract.name)}</strong></div><span class="status-dot ${contract.activo === false ? "is-inactive" : ""}">${contract.activo === false ? "Inactivo" : "Activo"}</span></div><p>${esc(contract.objetivo || contract.objective || "Sin objetivo contractual")}</p><div class="contract-kpi"><span>KPI</span><strong>${esc(contract.kpi_description || "Pendiente de definir")}</strong></div><button class="context-detail-link" data-open-contract-detail="${esc(contract.id)}"><span class="material-symbols-rounded">open_in_new</span>Abrir ficha del contrato</button></article>`
    : `<div class="context-empty-card"><span class="material-symbols-rounded">contract_delete</span><p>No existe un contrato vinculado a este nodo.</p></div>`;
  const errorNotice = bundle.error ? `<div class="context-notice"><span class="material-symbols-rounded">info</span>Parte del contexto no está disponible: ${esc(bundle.error)}</div>` : "";
  return `${errorNotice}<section class="context-hero"><span class="eyebrow">Propósito de la operación</span><p>${esc(objective || node.description || "Objetivo todavía no documentado")}</p></section>
    <section class="context-section"><div class="context-section-head"><span class="material-symbols-rounded">swap_horiz</span><div><strong>Transformación</strong><small>Material e información que atraviesa el nodo</small></div></div><div class="io-grid"><div><span class="field-label">Entradas</span>${contextChips(inputs)}</div><span class="io-arrow material-symbols-rounded">arrow_forward</span><div><span class="field-label">Salidas</span>${contextChips(outputs)}</div></div></section>
    <section class="context-section"><div class="context-section-head"><span class="material-symbols-rounded">precision_manufacturing</span><div><strong>Máquinas y recursos</strong><small>${machines.length} entidades enlazadas al grafo</small></div></div><div class="linked-entities">${machineCards}</div></section>
    <section class="context-section context-columns"><div><div class="context-section-head compact"><span class="material-symbols-rounded">tune</span><strong>Parámetros</strong></div>${contextBullets(parameters)}</div><div><div class="context-section-head compact"><span class="material-symbols-rounded">verified</span><strong>Controles</strong></div>${contextBullets(controls)}</div></section>
    <section class="context-section"><div class="context-section-head"><span class="material-symbols-rounded">contract</span><div><strong>Contrato operativo</strong><small>Objetivo y criterio de desempeño</small></div></div>${contractMarkup}</section>
    ${asList(questions).length ? `<details class="context-details"><summary><span><span class="material-symbols-rounded">help</span>Vacíos de conocimiento</span><b>${asList(questions).length}</b></summary>${contextChips(questions)}</details>` : ""}
    <section class="source-card"><div><span class="material-symbols-rounded">database</span><strong>Procedencia verificable</strong></div><p>${esc(source.reference || source.path || source.system || "UC_BIB_Solve")}${source.section ? ` · ${esc(source.section)}` : ""}</p><small>${esc(provenance.quality || "modelo")}${provenance.revision ? ` · revisión ${esc(provenance.revision)}` : ""}</small></section>`;
}

function inspectorTabs() {
  return `<nav class="inspector-tabs" role="tablist"><button class="inspector-tab${inspectorTab === "details" ? " is-active" : ""}" data-inspector-tab="details" role="tab"><span class="material-symbols-rounded">edit_note</span>Ficha</button><button class="inspector-tab${inspectorTab === "context" ? " is-active" : ""}" data-inspector-tab="context" role="tab"><span class="material-symbols-rounded">dataset_linked</span>Contexto</button><button class="inspector-tab${inspectorTab === "relations" ? " is-active" : ""}" data-inspector-tab="relations" role="tab"><span class="material-symbols-rounded">hub</span>Relaciones</button></nav>`;
}

function renderInspector() {
  const empty = $("#empty-inspector");
  const content = $("#inspector-content");
  if (!selected) { empty.hidden = false; content.hidden = true; return; }
  empty.hidden = true;
  content.hidden = false;
  if (selected.kind === "edge") {
    const edge = edgeById(selected.id);
    if (!edge) { selected = null; return renderInspector(); }
    content.innerHTML = `<div class="inspector-head"><div><span class="eyebrow">Relación semántica</span><h2>${esc(nodeById(edge.source)?.name)} → ${esc(nodeById(edge.target)?.name)}</h2></div><button class="icon-button" data-action="clear-selection"><span class="material-symbols-rounded">close</span></button></div><div class="inspector-body"><div class="form-field"><label for="edge-label">Etiqueta visible</label><input id="edge-label" data-edge-field="label" value="${esc(edge.label)}" placeholder="p. ej. Conforme" /></div><div class="form-field"><label for="edge-type">Tipo de relación</label><select id="edge-type" data-edge-field="type">${["sequence", "material_flow", "evidence", "branch", "rework"].map((type) => `<option value="${type}"${edge.type === type ? " selected" : ""}>${type.replace("_", " ")}</option>`).join("")}</select></div><div class="semantic-box"><h3><span class="material-symbols-rounded">hub</span>Identidad de grafo</h3><div class="semantic-row"><span>Relación</span><code>${esc(edge.id)}</code></div><div class="semantic-row"><span>Origen</span><code>${esc(edge.source)}</code></div><div class="semantic-row"><span>Destino</span><code>${esc(edge.target)}</code></div></div><button class="button button-secondary" data-action="insert-on-selected-edge"><span class="material-symbols-rounded">add_circle</span>Insertar operación aquí</button><button class="button button-secondary danger-button" data-action="delete-selected"><span class="material-symbols-rounded">delete</span>Eliminar relación</button></div>`;
    return;
  }
  const node = nodeById(selected.id);
  if (!node) { selected = null; return renderInspector(); }
  const meta = TYPE_META[node.type];
  const cachedContext = nodeContextCache.get(node.id);
  const completeness = contextCompleteness(node, cachedContext);
  const typeSpecific = node.type === "stock"
    ? `<div class="field-row"><div class="form-field"><label>Capacidad</label><input type="number" min="0" data-node-field="capacity" value="${esc(node.capacity || 0)}" /></div><div class="form-field"><label>Unidad</label><input data-node-field="unit" value="${esc(node.unit || "u")}" /></div></div>`
    : node.type === "end"
      ? `<div class="form-field"><label>Rol de la salida</label><select data-node-field="outputRole"><option value="normal"${node.outputRole !== "waste" ? " selected" : ""}>Salida normal</option><option value="waste"${node.outputRole === "waste" ? " selected" : ""}>Rechazo / residuo</option></select></div>`
    : !["start", "end", "decision"].includes(node.type)
      ? `<div class="field-row"><div class="form-field"><label>Duración (min)</label><input type="number" min="0" data-node-field="duration" value="${esc(node.duration || 0)}" /></div><div class="form-field"><label>Responsable</label><input data-node-field="owner" value="${esc(node.owner || "")}" /></div></div>` : "";
  const operational = node.type === "machine" ? `<div class="form-field"><label>Máquina / recurso</label><input data-node-field="resource" value="${esc(node.resource || "")}" placeholder="Código de activo" /></div>` : ["inspection", "verification"].includes(node.type) ? `<div class="form-field"><label>Criterio de aceptación</label><input data-node-field="criterion" value="${esc(node.criterion || "")}" placeholder="Condición medible" /></div>` : "";
  const subprocessField = node.type === "subprocess" ? `<div class="form-field"><label>Proceso hijo</label><select data-node-field="childProcessId"><option value="">Selecciona un proceso</option>${processCatalog.filter((item) => String(item.process_id) !== String(liveProcessId)).map((item) => `<option value="${esc(item.process_id)}"${String(node.childProcessId) === String(item.process_id) ? " selected" : ""}>${esc(item.name)}</option>`).join("")}</select></div><button class="button button-subprocess" data-open-subprocess="${esc(node.id)}" ${node.childProcessId ? "" : "disabled"}><span class="material-symbols-rounded">account_tree</span><span><strong>Abrir grafo del subproceso</strong><small>${esc(processCatalog.find((item) => String(item.process_id) === String(node.childProcessId))?.name || "Selecciona primero un proceso hijo")}</small></span><span class="material-symbols-rounded">arrow_forward</span></button>${node.childProcessId ? `<button class="context-detail-link context-detail-link-wide" data-open-process-record="${esc(node.childProcessId)}"><span class="material-symbols-rounded">open_in_new</span>Abrir ficha completa del proceso</button>` : ""}` : "";
  const branchLabels = new Set(model.edges.filter((edge) => edge.source === node.id && edge.type === "branch").map((edge) => String(edge.label || "").toLocaleLowerCase()));
  const decisionTools = node.type === "decision" ? `<section class="decision-branch-builder"><div class="decision-branch-heading"><span class="field-label">Salidas de la decisión</span><small>Crea la operación y la relación en un paso.</small></div><div class="decision-branch-buttons"><button class="branch-button branch-yes" data-add-decision-branch="Sí" ${branchLabels.has("sí") || branchLabels.has("si") ? "disabled" : ""}><span>SÍ</span><strong>+ Operación conforme</strong></button><button class="branch-button branch-no" data-add-decision-branch="No" ${branchLabels.has("no") ? "disabled" : ""}><span>NO</span><strong>+ Operación alternativa</strong></button></div></section>` : "";
  const operationRecordLink = ["machine", "manual", "inspection", "verification"].includes(node.type) ? `<button class="context-detail-link context-detail-link-wide" data-open-operation-detail="${esc(node.id)}"><span class="material-symbols-rounded">open_in_new</span>Abrir ficha operativa completa y metadatos</button>` : "";
  const detailsMarkup = `${decisionTools}<div class="field-row"><div class="form-field"><label>Código</label><input data-node-field="code" value="${esc(node.code)}" ${databaseMode ? "readonly" : ""} /></div><div class="form-field"><label>Tipo</label><select data-node-field="type">${Object.entries(TYPE_META).map(([type, item]) => `<option value="${type}"${node.type === type ? " selected" : ""}>${esc(item.label)}</option>`).join("")}</select></div></div><div class="form-field"><label>Nombre</label><input data-node-field="name" value="${esc(node.name)}" /></div><div class="form-field"><label>Descripción / instrucción</label><textarea data-node-field="description">${esc(node.description || "")}</textarea></div>${typeSpecific}${operational}${subprocessField}${operationRecordLink}`;
  const relationsMarkup = `<div><span class="field-label">Conexiones del nodo</span><div class="connection-list">${connectionMarkup(node)}</div></div><div class="semantic-box"><h3><span class="material-symbols-rounded">hub</span>Identidad semántica</h3><div class="semantic-row"><span>node_id</span><code title="${esc(node.id)}">${esc(node.id)}</code></div><div class="semantic-row"><span>Clase</span><code>industrial:${esc(node.type)}</code></div><div class="semantic-row"><span>Coordenadas</span><code>${databaseMode ? "proyección visual compartida" : "capa visual local"}</code></div></div><div class="inspector-actions"><button class="button button-secondary" data-action="duplicate-selected"><span class="material-symbols-rounded">content_copy</span>Duplicar</button><button class="button button-secondary danger-button" data-action="delete-selected"><span class="material-symbols-rounded">delete</span>Eliminar</button></div>`;
  const activeMarkup = inspectorTab === "context" ? renderContextTab(node) : inspectorTab === "relations" ? relationsMarkup : detailsMarkup;
  content.innerHTML = `<div class="inspector-head node-inspector-head"><span class="inspector-type-icon type-${esc(node.type)} material-symbols-rounded">${meta.icon}</span><div class="inspector-title"><span class="eyebrow">${esc(meta.label)}</span><h2 title="${esc(node.name)}">${esc(node.name)}</h2></div><div class="completeness" title="Completitud del contexto"><span style="--score:${completeness}%"></span><small>${completeness}%</small></div><button class="icon-button" data-action="clear-selection" aria-label="Cerrar inspector"><span class="material-symbols-rounded">close</span></button></div>${inspectorTabs()}<div class="inspector-body inspector-${inspectorTab}">${activeMarkup}</div>`;
}

async function addNode(type, edgeId = null, dropPosition = null, branchLabel = null) {
  if (databaseMode && type === "subprocess") {
    toast("Crea primero el proceso hijo y añádelo desde el modelador jerárquico", "account_tree");
    return;
  }
  if (databaseMode && edgeId) {
    const edge = edgeById(edgeId);
    if (!edge?._persisted) return;
    try {
      if (!await flushPendingChanges()) return;
      await api(`/api/bpm/processes/${encodeURIComponent(liveProcessId)}/transitions/${encodeURIComponent(edgeId)}/insert-operation`, {
        method: "POST", body: JSON.stringify({ name: TYPE_META.machine.defaultName, description: "", properties: { industrial_kind: "machine", studio: {} } }),
      });
      await loadDatabaseProcess(liveProcessId, { announce: false });
      toast("Operación insertada y guardada en la base de datos", "add_circle");
    } catch (error) { toast(error.message, "error"); }
    return;
  }
  const selectedPredecessorId = selected?.kind === "node" ? selected.id : null;
  snapshot();
  const count = model.nodes.filter((node) => node.type === type).length + 1;
  const prefix = { start: "EVT", end: "EVT", machine: "OPM", manual: "OPH", inspection: "INS", verification: "VER", stock: "STK", decision: "GW", subprocess: "SUB" }[type] || "NOD";
  const node = { id: uid("node"), code: `${prefix}-${String(count).padStart(2, "0")}`, type, name: TYPE_META[type].defaultName, description: "", owner: "", duration: 0, capacity: type === "stock" ? 24 : 0, initialQuantity: 0, unit: "u", _persisted: false };
  if (branchLabel === "Sí") node.name = "Continuar proceso";
  if (branchLabel === "No") node.name = "Gestionar no conformidad";
  model.nodes.push(node);
  if (dropPosition) { manualPositions[node.id] = dropPosition; layoutDirty = true; }
  if (edgeId) {
    const edge = edgeById(edgeId);
    if (edge) {
      const oldTarget = edge.target;
      edge.target = node.id;
      model.edges.push({ id: uid("edge"), source: node.id, target: oldTarget, type: edge.type === "rework" ? "sequence" : edge.type, label: "" });
    }
  } else if (!dropPosition) {
    const candidates = model.nodes.filter((item) => item.id !== node.id && item.type !== "end");
    const predecessor = databaseMode ? nodeById(selectedPredecessorId) : candidates[candidates.length - 1];
    if (predecessor && type !== "start") {
      const fromDecision = predecessor.type === "decision";
      model.edges.push({
        id: uid("edge"), source: predecessor.id, target: node.id,
        type: fromDecision ? "branch" : "sequence",
        label: fromDecision ? (branchLabel || nextDecisionBranchLabel(predecessor.id)) : "",
        _persisted: false,
      });
    }
  }
  selected = { kind: "node", id: node.id };
  selectedNodeIds = new Set([node.id]);
  markChanged();
  render();
  if (!databaseMode) return toast(`${TYPE_META[type].label} añadido`, "add_circle");
  try {
    const oldId = node.id;
    const created = await api(`/api/bpm/processes/${encodeURIComponent(liveProcessId)}/nodes`, { method: "POST", body: JSON.stringify(canonicalNodePayload(node)) });
    node.id = String(created.node_id);
    node.code = created.node_code;
    node._persisted = true;
    if (manualPositions[oldId]) { manualPositions[node.id] = manualPositions[oldId]; delete manualPositions[oldId]; }
    model.edges.forEach((edge) => {
      if (edge.source === oldId) edge.source = node.id;
      if (edge.target === oldId) edge.target = node.id;
    });
    if (selected?.id === oldId) selected.id = node.id;
    if (selectedNodeIds.delete(oldId)) selectedNodeIds.add(node.id);
    for (const edge of model.edges.filter((item) => !item._persisted && (item.source === node.id || item.target === node.id))) {
      if (!nodeById(edge.source)?._persisted || !nodeById(edge.target)?._persisted) continue;
      const createdEdge = await api(`/api/bpm/processes/${encodeURIComponent(liveProcessId)}/transitions`, { method: "POST", body: JSON.stringify(canonicalEdgePayload(edge)) });
      edge.id = String(createdEdge.transition_id); edge._persisted = true;
    }
    if (branchLabel && selectedPredecessorId) {
      selected = { kind: "node", id: selectedPredecessorId };
      selectedNodeIds = new Set([selectedPredecessorId]);
    }
    render();
    $("#save-label").textContent = "Guardado en base de datos";
    toast(`${TYPE_META[type].label} guardado en la base de datos`, "database");
  } catch (error) {
    if (databaseMode && liveProcessId) await loadDatabaseProcess(liveProcessId, { announce: false }).catch(() => {});
    else {
      model.nodes = model.nodes.filter((item) => item !== node);
      model.edges = model.edges.filter((edge) => edge.source !== node.id && edge.target !== node.id);
      selected = null;
      selectedNodeIds.clear();
      render();
    }
    toast(`No se pudo crear: ${error.message}`, "error");
  }
}

function beginConnection(nodeId) {
  connectionSource = nodeId;
  activeTool = "connect";
  $$("[data-tool]").forEach((button) => button.classList.toggle("is-active", button.dataset.tool === "connect"));
  render();
  toast("Ahora selecciona el elemento de destino", "conversion_path");
}

function nextDecisionBranchLabel(sourceId) {
  const labels = model.edges
    .filter((edge) => edge.source === sourceId && edge.type === "branch")
    .map((edge) => String(edge.label || "").trim().toLocaleLowerCase());
  if (!labels.includes("sí") && !labels.includes("si")) return "Sí";
  if (!labels.includes("no")) return "No";
  return `Rama ${labels.length + 1}`;
}

async function completeConnection(targetId) {
  if (!connectionSource || connectionSource === targetId) return;
  const duplicate = model.edges.some((edge) => edge.source === connectionSource && edge.target === targetId);
  if (duplicate) {
    toast("Esa relación ya existe", "info");
  } else {
    snapshot();
    const source = nodeById(connectionSource);
    const edge = { id: uid("edge"), source: connectionSource, target: targetId, type: source?.type === "decision" ? "branch" : "sequence", label: source?.type === "decision" ? nextDecisionBranchLabel(connectionSource) : "", _persisted: false };
    model.edges.push(edge);
    markChanged();
    if (databaseMode) {
      try {
        const created = await api(`/api/bpm/processes/${encodeURIComponent(liveProcessId)}/transitions`, { method: "POST", body: JSON.stringify(canonicalEdgePayload(edge)) });
        edge.id = String(created.transition_id); edge._persisted = true;
        toast("Relación creada en la base de datos", "link");
      } catch (error) {
        model.edges = model.edges.filter((item) => item !== edge);
        toast(`No se pudo conectar: ${error.message}`, "error");
      }
    } else toast("Relación creada en el grafo", "link");
  }
  connectionSource = null;
  activeTool = "select";
  $$("[data-tool]").forEach((button) => button.classList.toggle("is-active", button.dataset.tool === "select"));
  render();
}

function insertOperation(edgeId) { addNode("machine", edgeId); }

async function deleteSelected() {
  if (!selected) return;
  if (databaseMode) {
    const deleting = { ...selected };
    try {
      if (deleting.kind === "edge") await api(`/api/bpm/transitions/${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
      else {
        const node = nodeById(deleting.id);
        if (["machine", "manual", "inspection", "verification"].includes(node?.type)) {
          const incoming = model.edges.filter((edge) => edge.target === deleting.id);
          const outgoing = model.edges.filter((edge) => edge.source === deleting.id);
          const canReconnect = incoming.length === 1 && outgoing.length === 1
            && incoming[0].source !== outgoing[0].target;
          const reconnect = canReconnect
            ? window.confirm(`¿Eliminar «${node.name}» y reconectar automáticamente sus extremos?\n\nAceptar: elimina y reconecta.\nCancelar: elimina sin reconectar.`)
            : (window.confirm(`¿Eliminar «${node.name}» sin reconectar?\n\nLa operación no tiene exactamente una entrada y una salida válidas para reconectar.`));
          if (!reconnect) return;
          await api(`/api/bpm/nodes/${encodeURIComponent(deleting.id)}/operation-delete`, { method: "POST", body: JSON.stringify({ reconnect }) });
        } else {
          if (!window.confirm(`¿Eliminar «${node?.name || "este elemento"}» del flujo?`)) return;
          await api(`/api/bpm/nodes/${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
        }
      }
      delete manualPositions[deleting.id];
      await loadDatabaseProcess(liveProcessId, { announce: false });
      toast("Elemento eliminado de la base de datos", "delete_sweep");
    } catch (error) { toast(`No se pudo eliminar: ${error.message}`, "error"); }
    return;
  }
  snapshot();
  if (selected.kind === "edge") model.edges = model.edges.filter((edge) => edge.id !== selected.id);
  else {
    const incoming = model.edges.filter((edge) => edge.target === selected.id);
    const outgoing = model.edges.filter((edge) => edge.source === selected.id);
    model.nodes = model.nodes.filter((node) => node.id !== selected.id);
    model.edges = model.edges.filter((edge) => edge.source !== selected.id && edge.target !== selected.id);
    if (incoming.length === 1 && outgoing.length === 1 && incoming[0].source !== outgoing[0].target) {
      model.edges.push({ id: uid("edge"), source: incoming[0].source, target: outgoing[0].target, type: "sequence", label: "" });
    }
  }
  selected = null;
  selectedNodeIds.clear();
  markChanged();
  render();
  toast("Elemento eliminado; el grafo se ha reconciliado", "delete_sweep");
}

async function duplicateSelected() {
  if (selected?.kind !== "node") return;
  const source = nodeById(selected.id);
  snapshot();
  const copy = { ...clone(source), id: uid("node"), code: `${source.code}-COPIA`, name: `${source.name} (copia)` };
  model.nodes.push(copy);
  model.edges.push({ id: uid("edge"), source: source.id, target: copy.id, type: "sequence", label: "" });
  selected = { kind: "node", id: copy.id };
  selectedNodeIds = new Set([copy.id]);
  markChanged(); render();
  if (databaseMode) {
    model.nodes = model.nodes.filter((node) => node !== copy);
    model.edges = model.edges.filter((edge) => edge.source !== copy.id && edge.target !== copy.id);
    selected = { kind: "node", id: source.id };
    selectedNodeIds = new Set([source.id]);
    return addNode(source.type);
  }
  toast("Nodo duplicado con una identidad nueva", "content_copy");
}

function validationResults() {
  const issues = [];
  const starts = model.nodes.filter((node) => node.type === "start");
  const ends = model.nodes.filter((node) => node.type === "end");
  if (!starts.length) issues.push("Falta un evento de inicio explícito.");
  if (!ends.length) issues.push("Falta un evento de fin explícito.");
  model.nodes.forEach((node) => {
    if (!String(node.name || "").trim()) issues.push(`${node.code} no tiene un nombre comprensible.`);
    const attached = model.edges.some((edge) => edge.source === node.id || edge.target === node.id);
    if (!attached && model.nodes.length > 1) issues.push(`${node.code} está aislado del flujo.`);
    if (node.type === "decision") {
      const branches = model.edges.filter((edge) => edge.source === node.id && edge.type === "branch");
      if (branches.length < 2) issues.push(`${node.code} necesita al menos dos ramas explícitas.`);
      if (branches.some((edge) => !edge.label)) issues.push(`${node.code} contiene una rama sin etiqueta.`);
    }
    if (node.type === "machine" && !node.resource) issues.push(`${node.code} no tiene máquina o recurso asignado.`);
    if (["inspection", "verification"].includes(node.type) && !node.criterion) issues.push(`${node.code} no declara un criterio medible.`);
  });
  return issues;
}

async function showValidation() {
  let issues = validationResults();
  let authority = "Validación visual del espacio de trabajo";
  if (databaseMode && liveProcessId) {
    try {
      const result = await api(`/api/bpm/processes/${encodeURIComponent(liveProcessId)}/validate`, { method: "POST", body: "{}" });
      const backendIssues = (result.errors || []).map((item) => typeof item === "string" ? item : item.message || item.error || JSON.stringify(item));
      issues = [...new Set([...issues, ...backendIssues])];
      authority = result.valid ? "Validación del servidor y revisión visual" : "El servidor ha detectado errores estructurales";
    } catch (error) {
      issues.push(`No se pudo completar la validación del servidor: ${error.message}`);
      authority = "Validación visual; servidor no disponible";
    }
  }
  const score = Math.max(20, 100 - issues.length * 9);
  $("#validation-content").innerHTML = `<div class="validation-score"><div class="score-ring" style="--score:${score}%" data-score="${score}%"></div><div><strong>${issues.length ? `${issues.length} oportunidades de mejora` : "Modelo válido"}</strong><span>${esc(authority)}</span></div></div>${issues.length ? issues.map((issue) => `<div class="validation-item warning"><span class="material-symbols-rounded">warning</span><span>${esc(issue)}</span></div>`).join("") : '<div class="validation-item ok"><span class="material-symbols-rounded">verified</span><span>El proceso cumple las invariantes del dominio y las comprobaciones de legibilidad del Studio.</span></div>'}`;
  $("#validation-dialog").showModal();
}

function fixIssues() {
  snapshot();
  model.nodes.forEach((node) => {
    if (!node.name.trim()) node.name = TYPE_META[node.type].defaultName;
    if (node.type === "machine" && !node.resource) node.resource = "Pendiente de asignar";
    if (["inspection", "verification"].includes(node.type) && !node.criterion) node.criterion = "Definir criterio medible";
    if (node.type === "decision") model.edges.filter((edge) => edge.source === node.id && edge.type === "branch").forEach((edge, index) => { if (!edge.label) edge.label = index ? "No" : "Sí"; });
  });
  if (databaseMode) {
    model.nodes.filter((node) => node._persisted).forEach((node) => dirtyNodeIds.add(node.id));
    model.edges.filter((edge) => edge._persisted).forEach((edge) => dirtyEdgeIds.add(edge.id));
  }
  markChanged(); render(); $("#validation-dialog").close(); toast("Correcciones seguras aplicadas; revisa los campos pendientes", "auto_fix_high");
}

function semanticPayload() {
  return {
    schema: "uc_bib_solve.industrial_process_graph/v1",
    exported_at: new Date().toISOString(),
    process: clone(model.process),
    nodes: model.nodes.map(({ id, code, type, name, description, ...properties }) => ({ node_id: id, node_code: code, node_type: ["start", "end"].includes(type) ? (type === "start" ? "input" : "output") : ["machine", "manual", "inspection", "verification"].includes(type) ? "operation" : type, name, description, properties: { industrial_kind: type, ...properties } })),
    relationships: model.edges.map((edge) => ({ relationship_id: edge.id, source_node_id: edge.source, target_node_id: edge.target, relationship_type: edge.type, label: edge.label })),
    presentation: { strategy: "derived", persisted_coordinates: false },
  };
}

async function save(notify = true) {
  clearTimeout(saveTimer);
  saveTimer = null;
  model.process.name = $("#process-title").value.trim() || "Proceso sin nombre";
  if (databaseMode) {
    try {
      $("#save-label").textContent = "Guardando…";
      await api(`/api/bpm/processes/${encodeURIComponent(liveProcessId)}`, { method: "PATCH", body: JSON.stringify({ name: model.process.name }) });
      for (const nodeId of [...dirtyNodeIds]) {
        const node = nodeById(nodeId);
        if (node?._persisted) await api(`/api/bpm/nodes/${encodeURIComponent(nodeId)}`, { method: "PATCH", body: JSON.stringify(canonicalNodePayload(node)) });
      }
      for (const edgeId of [...dirtyEdgeIds]) {
        const edge = edgeById(edgeId);
        if (edge?._persisted) await api(`/api/bpm/transitions/${encodeURIComponent(edgeId)}`, { method: "PATCH", body: JSON.stringify(canonicalEdgePayload(edge)) });
      }
      dirtyNodeIds.clear();
      dirtyEdgeIds.clear();
      if (layoutDirty) {
        if (layoutPersistenceAvailable) {
          const layout = await api(`/api/bpm/processes/${encodeURIComponent(liveProcessId)}/layout`, {
            method: "PUT", body: JSON.stringify({ positions: canonicalLayoutPositions() }),
          });
          applyLayoutPositions(layout.positions || []);
        }
        layoutDirty = false;
      }
      $("#save-label").textContent = layoutPersistenceAvailable ? "Guardado en base de datos" : "Grafo guardado · diseño automático";
      if (notify) toast(layoutPersistenceAvailable
        ? "Proceso, relaciones y diseño guardados en PostgreSQL"
        : "Proceso y relaciones guardados; el layout compartido no está disponible", layoutPersistenceAvailable ? "cloud_done" : "warning");
      return true;
    } catch (error) {
      $("#save-label").textContent = "Error al guardar";
      toast(`No se pudo guardar: ${error.message}`, "error");
      return false;
    }
  }
  model.process.revision = Number(model.process.revision || 0) + 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ model, manualPositions }));
    $("#save-label").textContent = `Versión ${model.process.revision} guardada`;
    if (notify) toast("Versión guardada localmente; el grafo conserva su semántica", "cloud_done");
    return true;
  } catch {
    $("#save-label").textContent = "Edición activa";
    if (notify) toast("El navegador no permite almacenamiento local; puedes exportar el grafo", "info");
    return false;
  }
}

function exportGraph() {
  const blob = new Blob([JSON.stringify(semanticPayload(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `${model.process.code.toLowerCase()}-semantic-graph.json`; link.click();
  URL.revokeObjectURL(url);
  toast("Grafo semántico exportado sin coordenadas", "download_done");
}

function updateZoom() {
  $("#canvas-surface").style.transform = `scale(${zoom})`;
  $(".zoom-value").textContent = `${Math.round(zoom * 100)}%`;
}

function fit() {
  const viewport = $("#canvas-viewport");
  const maxX = Math.max(...model.nodes.map((node) => positions[node.id].x + nodeSize(node).width), 800) + 90;
  const maxY = Math.max(...model.nodes.map((node) => positions[node.id].y + nodeSize(node).height), 500) + 90;
  zoom = Math.min(1, Math.max(.48, Math.min(viewport.clientWidth / maxX, viewport.clientHeight / maxY)));
  updateZoom();
  viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
}

function renderView() {
  $$(".graph-view, .analysis-view").forEach((element) => element.remove());
  if (currentView === "design") return;
  if (currentView === "data") {
    const panel = document.createElement("section");
    panel.className = "graph-view";
    panel.innerHTML = `<table class="graph-table"><thead><tr><th>Identidad</th><th>Clase semántica</th><th>Nombre / relación</th><th>Contexto</th></tr></thead><tbody>${model.nodes.map((node) => `<tr><td><code>${esc(node.code)}</code></td><td>industrial:${esc(node.type)}</td><td>${esc(node.name)}</td><td>${esc(node.owner || node.resource || node.criterion || "—")}</td></tr>`).join("")}${model.edges.map((edge) => `<tr><td><code>${esc(edge.id)}</code></td><td>relation:${esc(edge.type)}</td><td>${esc(nodeById(edge.source)?.code)} → ${esc(nodeById(edge.target)?.code)}</td><td>${esc(edge.label || "—")}</td></tr>`).join("")}</tbody></table>`;
    $(".canvas-panel").append(panel);
  } else {
    const issues = validationResults();
    const totalDuration = model.nodes.reduce((sum, node) => sum + Number(node.duration || 0), 0);
    const panel = document.createElement("section"); panel.className = "analysis-view";
    panel.innerHTML = `<article class="analysis-card"><span>Tiempo de proceso</span><strong>${totalDuration} min</strong><p>Suma nominal de operaciones, sin esperas.</p></article><article class="analysis-card"><span>Puntos de control</span><strong>${model.nodes.filter((node) => ["inspection", "verification", "decision"].includes(node.type)).length}</strong><p>Inspecciones, verificaciones y decisiones.</p></article><article class="analysis-card"><span>Calidad semántica</span><strong>${Math.max(20, 100 - issues.length * 9)}%</strong><p>${issues.length} observaciones detectadas.</p></article><article class="analysis-card"><span>Recursos de máquina</span><strong>${new Set(model.nodes.filter((node) => node.resource).map((node) => node.resource)).size}</strong><p>Activos industriales referenciados.</p></article><article class="analysis-card"><span>Retrabajos</span><strong>${model.edges.filter((edge) => edge.type === "rework").length}</strong><p>Bucles de corrección explícitos en el grafo.</p></article><article class="analysis-card"><span>Trazabilidad</span><strong>${model.nodes.length + model.edges.length}</strong><p>Entidades y relaciones con identidad estable.</p></article>`;
    $(".canvas-panel").append(panel);
  }
}

function navigateApp(route, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ""));
  const hash = `#/${route}${query.toString() ? `?${query}` : ""}`;
  if (window.parent !== window) window.parent.location.hash = hash;
  else window.location.href = `./index.html${hash}`;
}

function openCreateProcessDialog() {
  const dialog = $("#process-create-dialog");
  if (!dialog.open) dialog.showModal();
  setTimeout(() => $("#new-process-name")?.focus(), 0);
}

async function createProcessFromStudio(form) {
  const submit = form.querySelector('[type="submit"]');
  const data = new FormData(form);
  submit.disabled = true;
  try {
    if (!await flushPendingChanges()) return;
    const created = await api("/api/bpm/processes", { method: "POST", body: JSON.stringify({ name: data.get("name"), description: data.get("description") || null, status: "draft" }) });
    processCatalog = await api("/api/bpm/processes");
    $("#db-process-selector").innerHTML = processCatalog.map((process) => `<option value="${esc(process.process_id)}">${esc(process.name)}</option>`).join("");
    navigationStack = [];
    await loadDatabaseProcess(created.process_id, { announce: false });
    syncNavigationUrl();
    form.reset();
    $("#process-create-dialog").close();
    toast(`Proceso creado: ${created.name}`, "add_box");
  } catch (error) {
    toast(`No se pudo crear el proceso: ${error.message}`, "error");
  } finally {
    submit.disabled = false;
  }
}

async function toggleFullscreen() {
  const panel = $(".canvas-panel");
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await panel.requestFullscreen();
  } catch {
    panel.classList.toggle("is-focus-mode");
    toast(panel.classList.contains("is-focus-mode") ? "Modo de enfoque activado" : "Modo de enfoque desactivado", "fullscreen");
  }
}

function syncNavigationUrl() {
  if (location.protocol === "file:" || !liveProcessId) return;
  const url = new URL(location.href);
  url.searchParams.set("processId", liveProcessId);
  if (navigationStack.length) url.searchParams.set("trail", navigationStack.map((item) => item.processId).join(","));
  else url.searchParams.delete("trail");
  window.history.replaceState(null, "", url);
}

async function openSubprocess(nodeId) {
  const node = nodeById(nodeId);
  if (!node || node.type !== "subprocess") return;
  if (!node.childProcessId) return toast("Este subproceso todavía no está vinculado a un grafo", "link_off");
  const visited = new Set([liveProcessId, ...navigationStack.map((item) => item.processId)].map(String));
  if (visited.has(String(node.childProcessId))) return toast("No se puede abrir una referencia cíclica de procesos", "error");
  if (!await flushPendingChanges()) return;
  const parent = { processId: String(liveProcessId), name: model.process.name, code: model.process.code, viaNodeId: node.id };
  navigationStack.push(parent);
  try {
    await loadDatabaseProcess(node.childProcessId, { announce: false });
    syncNavigationUrl();
    toast(`Subproceso abierto: ${model.process.name}`, "account_tree");
  } catch (error) {
    navigationStack.pop();
    toast(`No se pudo abrir el subproceso: ${error.message}`, "error");
  }
}

async function navigateToParent() {
  if (!await flushPendingChanges()) return;
  const parent = navigationStack.pop();
  if (!parent) return;
  try {
    await loadDatabaseProcess(parent.processId, { announce: false });
    syncNavigationUrl();
    toast(`Volviendo a ${model.process.name}`, "arrow_back");
  } catch (error) {
    navigationStack.push(parent);
    toast(`No se pudo volver al proceso anterior: ${error.message}`, "error");
  }
}

function alignSelection(mode) {
  const nodes = [...selectedNodeIds].map(nodeById).filter(Boolean);
  if (nodes.length < 2) return toast("Selecciona al menos dos elementos con Ctrl o ⌘ + clic", "select_all");
  if (mode.startsWith("distribute") && nodes.length < 3) return toast("Selecciona tres elementos para distribuirlos", "info");
  positions = layoutGraph();
  const boxes = nodes.map((node) => ({ node, ...positions[node.id], ...nodeSize(node) }));
  const anchor = boxes.find((box) => box.node.id === selected?.id) || boxes[0];
  const apply = (box, x, y) => { manualPositions[box.node.id] = { x: Math.round(x), y: Math.round(y) }; };
  if (mode === "top") boxes.forEach((box) => apply(box, box.x, anchor.y));
  if (mode === "middle") {
    const target = anchor.y + anchor.height / 2;
    boxes.forEach((box) => apply(box, box.x, target - box.height / 2));
  }
  if (mode === "bottom") {
    const target = anchor.y + anchor.height;
    boxes.forEach((box) => apply(box, box.x, target - box.height));
  }
  if (mode === "left") boxes.forEach((box) => apply(box, anchor.x, box.y));
  if (mode === "center") {
    const target = anchor.x + anchor.width / 2;
    boxes.forEach((box) => apply(box, target - box.width / 2, box.y));
  }
  if (mode === "right") {
    const target = anchor.x + anchor.width;
    boxes.forEach((box) => apply(box, target - box.width, box.y));
  }
  if (mode === "distribute-x") {
    const ordered = [...boxes].sort((a, b) => (a.x + a.width / 2) - (b.x + b.width / 2));
    const first = ordered[0].x + ordered[0].width / 2;
    const last = ordered.at(-1).x + ordered.at(-1).width / 2;
    ordered.forEach((box, index) => apply(box, first + ((last - first) * index) / (ordered.length - 1) - box.width / 2, box.y));
  }
  if (mode === "distribute-y") {
    const ordered = [...boxes].sort((a, b) => (a.y + a.height / 2) - (b.y + b.height / 2));
    const first = ordered[0].y + ordered[0].height / 2;
    const last = ordered.at(-1).y + ordered.at(-1).height / 2;
    ordered.forEach((box, index) => apply(box, box.x, first + ((last - first) * index) / (ordered.length - 1) - box.height / 2));
  }
  markLayoutChanged();
  render();
  toast("Selección alineada; la semántica del grafo no ha cambiado", "align_vertical_center");
}

function undo() {
  if (!history.length) return toast("No hay más cambios que deshacer", "info");
  future.push(clone(model)); model = history.pop(); selected = null; selectedNodeIds.clear(); markChanged(); render();
}

function redo() {
  if (!future.length) return toast("No hay cambios que rehacer", "info");
  history.push(clone(model)); model = future.pop(); selected = null; selectedNodeIds.clear(); markChanged(); render();
}

document.addEventListener("click", (event) => {
  const subprocessLink = event.target.closest("[data-open-subprocess]");
  if (subprocessLink) return openSubprocess(subprocessLink.dataset.openSubprocess);
  const operationDetail = event.target.closest("[data-open-operation-detail]");
  if (operationDetail) return navigateApp("operaciones_detalle", { process_id: liveProcessId, node_id: operationDetail.dataset.openOperationDetail });
  const processRecord = event.target.closest("[data-open-process-record]");
  if (processRecord) return navigateApp("procesos_detalle", { bpm_process_id: processRecord.dataset.openProcessRecord });
  const machineDetail = event.target.closest("[data-open-machine-detail]");
  if (machineDetail) return navigateApp("maquinas_detalle", { machine_id: machineDetail.dataset.openMachineDetail });
  const contractDetail = event.target.closest("[data-open-contract-detail]");
  if (contractDetail) return navigateApp("contratos_detalle", { contract_id: contractDetail.dataset.openContractDetail });
  const inspectorTabButton = event.target.closest("[data-inspector-tab]");
  if (inspectorTabButton) {
    inspectorTab = inspectorTabButton.dataset.inspectorTab;
    renderInspector();
    return;
  }
  const alignment = event.target.closest("[data-align]");
  if (alignment) return alignSelection(alignment.dataset.align);
  const decisionBranch = event.target.closest("[data-add-decision-branch]");
  if (decisionBranch && selected?.kind === "node" && nodeById(selected.id)?.type === "decision") {
    return addNode("machine", null, null, decisionBranch.dataset.addDecisionBranch);
  }
  const add = event.target.closest("[data-add-type]");
  if (add) return addNode(add.dataset.addType);
  const connectHandle = event.target.closest("[data-connect-from]");
  if (connectHandle) return beginConnection(connectHandle.dataset.connectFrom);
  const nodeElement = event.target.closest("[data-node-id]");
  if (nodeElement) {
    if (activeTool === "connect" && connectionSource) return completeConnection(nodeElement.dataset.nodeId);
    const nodeId = nodeElement.dataset.nodeId;
    if ((event.ctrlKey || event.metaKey) && activeTool === "select") {
      if (selectedNodeIds.has(nodeId)) selectedNodeIds.delete(nodeId);
      else selectedNodeIds.add(nodeId);
      if (!selectedNodeIds.size) selected = null;
      else if (!selected || selected.kind !== "node" || !selectedNodeIds.has(selected.id)) selected = { kind: "node", id: [...selectedNodeIds][0] };
    } else {
      selectedNodeIds = new Set([nodeId]);
      selected = { kind: "node", id: nodeId };
    }
    render(); return;
  }
  const edgeElement = event.target.closest("[data-edge-id]");
  if (edgeElement && !event.target.closest("[data-insert-edge]")) { selectedNodeIds.clear(); selected = { kind: "edge", id: edgeElement.dataset.edgeId }; render(); return; }
  const insert = event.target.closest("[data-insert-edge]");
  if (insert) return insertOperation(insert.dataset.insertEdge);
  const selectEdge = event.target.closest("[data-select-edge]");
  if (selectEdge) { selectedNodeIds.clear(); selected = { kind: "edge", id: selectEdge.dataset.selectEdge }; render(); return; }
  const view = event.target.closest("[data-view]");
  if (view) { currentView = view.dataset.view; $$(".view-tab").forEach((tab) => tab.classList.toggle("is-active", tab === view)); renderView(); return; }
  const tool = event.target.closest("[data-tool]");
  if (tool) { activeTool = tool.dataset.tool; if (activeTool !== "connect") connectionSource = null; $$("[data-tool]").forEach((button) => button.classList.toggle("is-active", button === tool)); $("#canvas-viewport").classList.toggle("is-panning", activeTool === "pan"); render(); return; }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  ({
    undo, redo, save, export: exportGraph, validate: showValidation, "fix-issues": fixIssues,
    "delete-selected": deleteSelected, "duplicate-selected": duplicateSelected,
    "insert-on-selected-edge": () => selected?.kind === "edge" && insertOperation(selected.id),
    "clear-selection": () => { selected = null; selectedNodeIds.clear(); render(); },
    "navigate-parent": navigateToParent,
    "create-process-dialog": openCreateProcessDialog,
    "open-process-detail": () => navigateApp("procesos_detalle", { bpm_process_id: liveProcessId }),
    "toggle-fullscreen": toggleFullscreen,
    "auto-layout": () => { manualPositions = {}; render(); markLayoutChanged(); toast("Diseño recalculado desde la topología del grafo", "auto_awesome_motion"); },
    "import-legacy-layout": importLegacyLayout,
    "ignore-legacy-layout": ignoreLegacyLayout,
    "zoom-in": () => { zoom = Math.min(1.5, zoom + .1); updateZoom(); },
    "zoom-out": () => { zoom = Math.max(.4, zoom - .1); updateZoom(); },
    "zoom-reset": () => { zoom = 1; updateZoom(); }, fit,
    shortcuts: () => $("#shortcuts-dialog").showModal(),
    "close-dialog": () => event.target.closest("dialog")?.close(),
    "toggle-library": () => $("#library-panel").classList.toggle("is-open"),
  }[action] || (() => {}))();
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "process-create-form") return;
  event.preventDefault();
  if (event.target.reportValidity()) createProcessFromStudio(event.target);
});

document.addEventListener("input", (event) => {
  if (event.target.id === "node-search") return render();
  if (event.target.id === "process-title") { model.process.name = event.target.value; markChanged(); return; }
  const nodeField = event.target.dataset.nodeField;
  if (nodeField && selected?.kind === "node") {
    if (event.target.type === "number") nodeById(selected.id)[nodeField] = Number(event.target.value);
    else nodeById(selected.id)[nodeField] = event.target.value;
    if (databaseMode && nodeById(selected.id)?._persisted && nodeField !== "code") dirtyNodeIds.add(selected.id);
    markChanged();
    if (["name", "description", "code", "type", "owner", "duration", "capacity", "unit"].includes(nodeField)) {
      positions = layoutGraph(); $("#nodes-layer").innerHTML = model.nodes.map(nodeMarkup).join(""); renderEdges(); renderSummary();
    }
    if (nodeField === "type") renderInspector();
    return;
  }
  const edgeField = event.target.dataset.edgeField;
  if (edgeField && selected?.kind === "edge") {
    edgeById(selected.id)[edgeField] = event.target.value;
    if (databaseMode && edgeById(selected.id)?._persisted) dirtyEdgeIds.add(selected.id);
    markChanged(); renderEdges();
  }
});

$("#db-process-selector").addEventListener("change", async (event) => {
  if (!event.target.value || !databaseMode) return;
  if (!await flushPendingChanges()) { event.target.value = liveProcessId; return; }
  const previousStack = navigationStack;
  navigationStack = [];
  try { await loadDatabaseProcess(event.target.value); syncNavigationUrl(); }
  catch (error) { navigationStack = previousStack; toast(`No se pudo cargar el proceso: ${error.message}`, "error"); }
});

document.addEventListener("dblclick", (event) => {
  const nodeElement = event.target.closest("[data-node-id]");
  const node = nodeElement ? nodeById(nodeElement.dataset.nodeId) : null;
  if (node?.type === "subprocess" && node.childProcessId) openSubprocess(node.id);
});

document.addEventListener("focusin", (event) => {
  if ((event.target.dataset.nodeField || event.target.dataset.edgeField || event.target.id === "process-title") && event.target.dataset.historyCaptured !== "true") {
    snapshot();
    event.target.dataset.historyCaptured = "true";
  }
});
document.addEventListener("focusout", (event) => {
  if (event.target.dataset.historyCaptured) delete event.target.dataset.historyCaptured;
});

document.addEventListener("dragstart", (event) => {
  const port = event.target.closest("[data-connect-from]");
  if (port) {
    const payload = JSON.stringify({ kind: "connect", source: port.dataset.connectFrom });
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.effectAllowed = "link";
    connectionSource = port.dataset.connectFrom;
    return;
  }
  const item = event.target.closest("[data-add-type]");
  if (item) {
    const payload = JSON.stringify({ kind: "new", type: item.dataset.addType });
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.effectAllowed = "copy";
    return;
  }
  const existing = event.target.closest("[data-node-id]");
  if (existing) {
    const payload = JSON.stringify({ kind: "move", nodeId: existing.dataset.nodeId });
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.effectAllowed = "move";
  }
});
$("#canvas-viewport").addEventListener("dragover", (event) => { event.preventDefault(); $("#canvas-surface").classList.add("is-drop-target"); });
$("#canvas-viewport").addEventListener("dragleave", (event) => { if (!event.currentTarget.contains(event.relatedTarget)) $("#canvas-surface").classList.remove("is-drop-target"); });
$("#canvas-viewport").addEventListener("drop", (event) => {
  event.preventDefault();
  $("#canvas-surface").classList.remove("is-drop-target");
  let payload;
  try { payload = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
  if (payload.kind === "connect") {
    const target = event.target.closest("[data-node-id]")?.dataset.nodeId;
    connectionSource = payload.source;
    if (target && target !== payload.source) return completeConnection(target);
    connectionSource = null;
    return;
  }
  const surfaceRect = $("#canvas-surface").getBoundingClientRect();
  const point = { x: Math.max(24, (event.clientX - surfaceRect.left) / zoom), y: Math.max(72, (event.clientY - surfaceRect.top) / zoom) };
  if (payload.kind === "new" && TYPE_META[payload.type]) {
    const size = nodeSize({ type: payload.type });
    return addNode(payload.type, null, { x: point.x - size.width / 2, y: point.y - size.height / 2 });
  }
  if (payload.kind === "move" && nodeById(payload.nodeId)) {
    snapshot();
    const size = nodeSize(nodeById(payload.nodeId));
    manualPositions[payload.nodeId] = { x: point.x - size.width / 2, y: point.y - size.height / 2 };
    selected = { kind: "node", id: payload.nodeId };
    selectedNodeIds = new Set([payload.nodeId]);
    markLayoutChanged(); render(); toast("Elemento reposicionado; su identidad no ha cambiado", "open_with");
  }
});

$("#canvas-viewport").addEventListener("wheel", (event) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  event.preventDefault(); zoom = Math.max(.4, Math.min(1.5, zoom + (event.deltaY < 0 ? .08 : -.08))); updateZoom();
}, { passive: false });
$("#canvas-viewport").addEventListener("pointerdown", (event) => {
  if (activeTool !== "pan" && event.button !== 1 && !event.shiftKey) return;
  panStart = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
  event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.classList.add("is-dragging");
});
$("#canvas-viewport").addEventListener("pointermove", (event) => {
  if (!panStart) return;
  event.currentTarget.scrollLeft = panStart.left - (event.clientX - panStart.x); event.currentTarget.scrollTop = panStart.top - (event.clientY - panStart.y);
});
$("#canvas-viewport").addEventListener("pointerup", (event) => { panStart = null; event.currentTarget.classList.remove("is-dragging"); });

document.addEventListener("fullscreenchange", () => {
  const button = $('[data-action="toggle-fullscreen"]');
  const icon = button?.querySelector(".material-symbols-rounded");
  if (icon) icon.textContent = document.fullscreenElement ? "fullscreen_exit" : "fullscreen";
  if (button) button.title = document.fullscreenElement ? "Salir de pantalla completa" : "Pantalla completa";
});

document.addEventListener("keydown", (event) => {
  const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); return event.shiftKey ? redo() : undo(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && !editing) { event.preventDefault(); return duplicateSelected(); }
  if (["Delete", "Backspace"].includes(event.key) && !editing) return deleteSelected();
  if (event.key === "Escape") { selected = null; selectedNodeIds.clear(); connectionSource = null; activeTool = "select"; render(); $$("dialog[open]").forEach((dialog) => dialog.close()); }
  if (event.key.toLowerCase() === "f" && !editing) fit();
  if (event.key.toLowerCase() === "v" && !editing) activeTool = "select";
  if (event.key.toLowerCase() === "h" && !editing) activeTool = "pan";
  if (event.key.toLowerCase() === "c" && !editing) activeTool = "connect";
});

try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (stored?.model?.process && Array.isArray(stored.model.nodes) && Array.isArray(stored.model.edges)) {
    model = stored.model;
    manualPositions = stored.manualPositions || {};
  } else if (stored?.process && Array.isArray(stored.nodes) && Array.isArray(stored.edges)) {
    model = stored;
  }
} catch { /* A corrupt local draft should never prevent the editor from opening. */ }

if (new URLSearchParams(location.search).get("embedded") === "1") document.body.classList.add("is-embedded");
render();
initializeDatabase().then(() => setTimeout(fit, 120));
