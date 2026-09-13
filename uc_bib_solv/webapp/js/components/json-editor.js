/** Accessible structured JSON editor. JSON remains the transport/storage
 * format, while ordinary users edit ordered title/description rows.
 */
import {
  addStructuredRow, cloneStructured, createStructuredDraft, moveStructuredRow,
  removeStructuredRow, replaceStructuredValue, serializeStructuredDraft, updateStructuredRow,
} from "./structured-field-model.js";

export const JSON_FIELD_CONTRACT = Object.freeze({
  nominal_capacity: { kind: "object", nullable: true, label: "Capacidad nominal" },
  control_systems: { kind: "list", nullable: true, label: "Sistemas de control" },
  common_limitations: { kind: "object-or-list", nullable: true, label: "Limitaciones comunes" },
  common_technical_characteristics: { kind: "object-or-list", nullable: true, label: "Características comunes" },
  specific_characteristics: { kind: "object-or-list", nullable: true, label: "Características específicas" },
  specific_parameters: { kind: "list", nullable: true, label: "Parámetros" },
  specific_operating_ranges: { kind: "list", nullable: true, label: "Rangos operativos" },
  specific_limitations: { kind: "object-or-list", nullable: true, label: "Limitaciones específicas" },
  specific_instructions: { kind: "list", nullable: true, label: "Instrucciones" },
  differences_from_machine_type: { kind: "object-or-list", nullable: true, label: "Diferencias frente al tipo" },
  elements_zones_positions: { kind: "list", nullable: true, label: "Elementos, zonas y posiciones" },
});

const editorStates = new WeakMap();
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
export const cloneJson = cloneStructured;

export function fieldModel(field, value, overrides = {}) {
  const contract = JSON_FIELD_CONTRACT[field] || { kind: "advanced", nullable: true, label: field };
  return { field, kind: contract.kind, nullable: contract.nullable, value: cloneJson(value), errors: [], dirty: false, ...overrides };
}

function error(code, field, message) { return { code, field, message }; }

export function validateJsonField(field, value, { nullable = JSON_FIELD_CONTRACT[field]?.nullable ?? true, kind } = {}) {
  const contract = JSON_FIELD_CONTRACT[field] || { kind: kind || "advanced", label: field };
  const expectedKind = kind || contract.kind;
  if (value === null || value === undefined || value === "") return nullable ? { value: null, errors: [] } : { value, errors: [error("required_json", field, `${contract.label || field} es obligatorio.`)] };
  const isObject = typeof value === "object" && value !== null && !Array.isArray(value);
  const isList = Array.isArray(value);
  const valid = expectedKind === "object" ? isObject : expectedKind === "list" ? isList : expectedKind === "object-or-list" || expectedKind === "advanced" ? (isObject || isList) : true;
  return valid ? { value: cloneJson(value), errors: [] } : { value, errors: [error("invalid_json_shape", field, `${contract.label || field} debe tener forma ${expectedKind === "object" ? "de objeto" : expectedKind === "list" ? "de lista" : "de objeto o lista"}.`)] };
}

export function parseAdvancedJson(field, raw, options = {}) {
  try { return validateJsonField(field, JSON.parse(String(raw || "")), options); }
  catch (_error) { return { value: raw, errors: [error("invalid_json_syntax", field, `El JSON de ${options.label || JSON_FIELD_CONTRACT[field]?.label || field} no es válido.`)] }; }
}

export function setFieldValue(model, value) {
  const checked = validateJsonField(model.field, value, model);
  return { ...model, value: checked.value, errors: checked.errors, dirty: true };
}

export function serializeFields(models) {
  const payload = {}; const errors = [];
  Object.values(models || {}).forEach((model) => { const checked = validateJsonField(model.field, model.value, model); errors.push(...checked.errors); if (!checked.errors.length) payload[model.field] = checked.value; });
  return { payload, errors };
}

export function structuredEditorMarkup(field, value, options = {}) {
  const contract = JSON_FIELD_CONTRACT[field] || {};
  const kind = options.kind || contract.kind || "advanced";
  const label = options.label || contract.label || field;
  const id = options.id || `json-editor-${field}`;
  const encoded = value === null || value === undefined ? "" : JSON.stringify(value, null, 2);
  return `<div class="json-editor structured-field-editor" data-json-editor="${escape(field)}" data-json-kind="${escape(kind)}" data-json-label="${escape(label)}" data-json-nullable="${options.nullable === false ? "false" : "true"}">
    <textarea data-json-source hidden>${escape(encoded)}</textarea>
    <div data-json-guided aria-label="Editor estructurado de ${escape(label)}"><div class="structured-editor-head"><p>Editor guiado</p><button type="button" data-json-action="add"><span aria-hidden="true">＋</span> Añadir elemento</button></div>
    ${kind === "object-or-list" ? `<div class="structured-shape" role="group" aria-label="Forma de ${escape(label)}"><button type="button" data-json-shape="list">Lista</button><button type="button" data-json-shape="object">Propiedades</button></div>` : ""}
    <div class="structured-editor-items" data-json-items role="list"></div><p class="structured-editor-empty" data-json-empty>Sin elementos definidos.</p></div>
    ${options.advanced === false ? "" : `<details class="structured-advanced"><summary>Modo técnico · JSON</summary><p>Opcional. El flujo normal no requiere editar este contenido.</p><textarea id="${escape(id)}" data-json-advanced rows="5" aria-describedby="${escape(id)}-help">${escape(encoded)}</textarea><span id="${escape(id)}-help">La estructura se valida antes de guardar.</span></details>`}
    <p class="structured-editor-error" data-json-error role="alert"></p><span class="sr-only" data-json-live aria-live="polite"></span>
  </div>`;
}

function rowMarkup(row, index, shape, total) {
  const extras = row.extraKeys?.length ? `<details class="structured-row-extras"><summary>${row.extraKeys.length} datos adicionales conservados</summary><ul>${row.extraKeys.map((key) => `<li>${escape(key)}</li>`).join("")}</ul></details>` : "";
  const property = shape === "object";
  return `<article class="structured-editor-row" data-json-row="${escape(row.id)}" role="listitem"><div class="structured-row-index" aria-hidden="true">${index + 1}</div><div class="structured-row-fields">
    <label><span>${property ? "Título / clave" : "Título"}</span><input ${property ? "data-json-object-key" : "data-json-item"} data-json-row-field="title" value="${escape(row.title)}" aria-label="${property ? "Clave" : "Título"} del elemento ${index + 1}"></label>
    <label><span>${property ? "Descripción / valor" : "Descripción"}</span><textarea ${property ? "data-json-object-value" : ""} data-json-row-field="description" rows="2" ${row.complex ? "readonly" : ""} aria-label="Descripción del elemento ${index + 1}">${escape(row.description)}</textarea></label>
    ${row.complex ? `<p class="structured-complex-note">Valor estructurado conservado. Puede cambiar el título sin alterar su contenido.</p>` : ""}${extras}<p class="structured-row-error" data-json-row-error></p></div>
    <div class="structured-row-actions" aria-label="Orden y eliminación"><button type="button" data-json-action="up" ${index === 0 ? "disabled" : ""} aria-label="Subir elemento ${index + 1}">↑</button><button type="button" data-json-action="down" ${index === total - 1 ? "disabled" : ""} aria-label="Bajar elemento ${index + 1}">↓</button><button type="button" data-json-action="remove" aria-label="Eliminar elemento ${index + 1}">Eliminar</button></div></article>`;
}

function optionsOf(editor) { return { kind: editor.dataset.jsonKind, nullable: editor.dataset.jsonNullable !== "false", label: editor.dataset.jsonLabel }; }
function announce(editor, message) { const live = editor.querySelector("[data-json-live]"); if (live) live.textContent = message; }
function syncAdvanced(editor, value) { const advanced = editor.querySelector("[data-json-advanced]"); if (advanced) { advanced.value = value === null || value === undefined ? "" : JSON.stringify(value, null, 2); advanced.dataset.dirty = "false"; } }
function renderEditor(editor) {
  const draft = editorStates.get(editor); if (!draft) return;
  editor.querySelector("[data-json-items]").innerHTML = draft.rows.map((row, index) => rowMarkup(row, index, draft.shape, draft.rows.length)).join("");
  editor.querySelector("[data-json-empty]").hidden = Boolean(draft.rows.length);
  editor.querySelectorAll("[data-json-shape]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.jsonShape === draft.shape)));
  syncAdvanced(editor, serializeStructuredDraft(draft).value);
}
function emitChange(editor) { const result = readStructuredEditor(editor); editor.dispatchEvent(new CustomEvent("json-editor:change", { bubbles: true, detail: result.value })); }

export function mountStructuredEditors(root) {
  root.querySelectorAll("[data-json-editor]").forEach((editor) => {
    if (editorStates.has(editor)) return;
    const advanced = editor.querySelector("[data-json-advanced]"); const source = editor.querySelector("[data-json-source]"); let initial = null;
    const initialRaw = advanced?.value?.trim() || source?.value?.trim();
    if (initialRaw) { try { initial = JSON.parse(initialRaw); } catch { initial = null; } }
    const options = optionsOf(editor); editorStates.set(editor, createStructuredDraft(editor.dataset.jsonEditor, initial, options)); renderEditor(editor);
    editor.addEventListener("input", (event) => {
      if (event.target.matches("[data-json-advanced]")) { event.target.dataset.dirty = "true"; const checked = parseAdvancedJson(editor.dataset.jsonEditor, event.target.value, options); editor.querySelector("[data-json-error]").textContent = checked.errors[0]?.message || ""; return; }
      const input = event.target.closest("[data-json-row-field]"); const row = event.target.closest("[data-json-row]"); if (!input || !row) return;
      const draft = updateStructuredRow(editorStates.get(editor), row.dataset.jsonRow, { [input.dataset.jsonRowField]: input.value }); editorStates.set(editor, draft); syncAdvanced(editor, serializeStructuredDraft(draft).value); emitChange(editor);
    });
    editor.addEventListener("click", (event) => {
      const shapeButton = event.target.closest("[data-json-shape]");
      if (shapeButton) { const draft = editorStates.get(editor); const shape = shapeButton.dataset.jsonShape; if (shape === draft.shape) return; if (draft.rows.length && !window.confirm("Cambiar la forma puede transformar los elementos actuales. ¿Continuar?")) return; editorStates.set(editor, createStructuredDraft(draft.field, shape === "list" ? [] : {}, options)); renderEditor(editor); announce(editor, `Forma cambiada a ${shape === "list" ? "lista" : "propiedades"}.`); emitChange(editor); return; }
      const action = event.target.closest("[data-json-action]")?.dataset.jsonAction; if (!action) return;
      let draft = editorStates.get(editor); let focusId = null;
      if (action === "add") { const added = addStructuredRow(draft); draft = added.draft; focusId = added.rowId; announce(editor, "Elemento añadido."); }
      const row = event.target.closest("[data-json-row]");
      if (action === "remove" && row) { const target = draft.rows.find((item) => item.id === row.dataset.jsonRow); if ((target?.description || target?.extraKeys?.length || target?.complex) && !window.confirm("El elemento contiene información. ¿Eliminarlo?")) return; const index = draft.rows.findIndex((item) => item.id === row.dataset.jsonRow); draft = removeStructuredRow(draft, row.dataset.jsonRow); focusId = draft.rows[Math.min(index, draft.rows.length - 1)]?.id; announce(editor, "Elemento eliminado."); }
      if (["up", "down"].includes(action) && row) { draft = moveStructuredRow(draft, row.dataset.jsonRow, action); focusId = row.dataset.jsonRow; announce(editor, action === "up" ? "Elemento desplazado hacia arriba." : "Elemento desplazado hacia abajo."); }
      editorStates.set(editor, draft); renderEditor(editor); emitChange(editor); if (focusId) editor.querySelector(`[data-json-row="${focusId}"] [data-json-row-field="title"]`)?.focus();
    });
  });
}

export function readStructuredEditor(editor) {
  if (!editorStates.has(editor)) mountStructuredEditors(editor.parentElement || document);
  const options = optionsOf(editor); const advanced = editor.querySelector("[data-json-advanced]");
  const result = advanced?.dataset.dirty === "true" ? parseAdvancedJson(editor.dataset.jsonEditor, advanced.value, options) : serializeStructuredDraft(editorStates.get(editor));
  const shapeErrors = result.errors.length ? [] : validateJsonField(editor.dataset.jsonEditor, result.value, options).errors;
  const errors = [...(result.errors || []), ...shapeErrors]; editor.querySelector("[data-json-error]").textContent = errors[0]?.message || "";
  editor.querySelectorAll("[data-json-row-error]").forEach((node) => { node.textContent = ""; });
  errors.forEach((item) => { if (item.rowId) editor.querySelector(`[data-json-row="${item.rowId}"] [data-json-row-error]`)?.append(item.message); });
  return { value: result.value, errors };
}

export function setStructuredEditorValue(editor, value) { const current = editorStates.get(editor); editorStates.set(editor, current ? replaceStructuredValue(current, value) : createStructuredDraft(editor.dataset.jsonEditor, value, optionsOf(editor))); renderEditor(editor); }
export function isStructuredEditorDirty(editor) { return Boolean(editorStates.get(editor)?.dirty || editor.querySelector("[data-json-advanced]")?.dataset.dirty === "true"); }
