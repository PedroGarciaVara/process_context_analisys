/** Common structured JSON editor contract used by Machine and PM metadata.
 * The advanced control is explicit: normal operation edits native values and
 * only open-schema values use the validated JSON textarea.
 */
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

export function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function fieldModel(field, value, overrides = {}) {
  const contract = JSON_FIELD_CONTRACT[field] || { kind: "advanced", nullable: true, label: field };
  return { field, kind: contract.kind, nullable: contract.nullable, value: cloneJson(value), errors: [], dirty: false, ...overrides };
}

function error(code, field, message) { return { code, field, message }; }

export function validateJsonField(field, value, { nullable = JSON_FIELD_CONTRACT[field]?.nullable ?? true } = {}) {
  const contract = JSON_FIELD_CONTRACT[field] || { kind: "advanced" };
  if (value === null || value === undefined || value === "") {
    return nullable ? { value: null, errors: [] } : { value, errors: [error("required_json", field, `${contract.label || field} es obligatorio.`)] };
  }
  const isObject = typeof value === "object" && value !== null && !Array.isArray(value);
  const isList = Array.isArray(value);
  const valid = contract.kind === "object" ? isObject : contract.kind === "list" ? isList : contract.kind === "object-or-list" || contract.kind === "advanced" ? (isObject || isList) : true;
  return valid ? { value: cloneJson(value), errors: [] } : { value, errors: [error("invalid_json_shape", field, `${contract.label || field} debe tener forma ${contract.kind === "object" ? "de objeto" : contract.kind === "list" ? "de lista" : "de objeto o lista"}.`)] };
}

export function parseAdvancedJson(field, raw) {
  try {
    const parsed = JSON.parse(String(raw || ""));
    return validateJsonField(field, parsed);
  } catch (_error) {
    return { value: raw, errors: [error("invalid_json_syntax", field, `El JSON de ${JSON_FIELD_CONTRACT[field]?.label || field} no es válido.`)] };
  }
}

export function setFieldValue(model, value) {
  const checked = validateJsonField(model.field, value, model);
  return { ...model, value: checked.value, errors: checked.errors, dirty: true };
}

export function serializeFields(models) {
  const payload = {};
  const errors = [];
  Object.values(models || {}).forEach((model) => {
    const checked = validateJsonField(model.field, model.value, model);
    errors.push(...checked.errors);
    if (!checked.errors.length) payload[model.field] = checked.value;
  });
  return { payload, errors };
}

export function structuredEditorMarkup(field, value, { advanced = true, id = `json-editor-${field}` } = {}) {
  const contract = JSON_FIELD_CONTRACT[field] || { kind: "advanced", label: field };
  const encoded = value === null || value === undefined ? "" : JSON.stringify(value, null, 2);
  return `<div class="json-editor" data-json-editor="${field}" data-json-kind="${contract.kind}">
    <div class="json-editor-guided" data-json-guided aria-label="Editor estructurado de ${contract.label || field}">
      <p class="text-[11px] text-on-surface-variant">Editor guiado · ${contract.kind === "list" ? "lista repetible" : contract.kind === "object" ? "objeto por propiedades" : "objeto o lista"}</p>
      <button type="button" class="px-sm py-xs border border-outline rounded" data-json-action="add">Añadir elemento</button>
      <div data-json-items></div>
    </div>
    ${advanced ? `<details class="mt-xs"><summary class="cursor-pointer text-[11px] text-primary">Modo avanzado (JSON validado)</summary><textarea id="${id}" class="w-full min-h-20 border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm" data-json-advanced rows="4" aria-describedby="${id}-help">${encoded}</textarea><span id="${id}-help" class="text-[11px] text-on-surface-variant">Solo se usa para estructuras abiertas; el servidor vuelve a validar la forma.</span></details>` : ""}
    <p class="text-[11px] text-red-700" data-json-error role="alert"></p>
  </div>`;
}

export function mountStructuredEditors(root) {
  root.querySelectorAll("[data-json-editor]").forEach((editor) => {
    const field = editor.dataset.jsonEditor;
    const advanced = editor.querySelector("[data-json-advanced]");
    const items = editor.querySelector("[data-json-items]");
    const errorNode = editor.querySelector("[data-json-error]");
    const read = () => {
      try { return advanced?.value?.trim() ? JSON.parse(advanced.value) : null; } catch (_error) { return undefined; }
    };
    const write = (value) => {
      if (advanced) advanced.value = value === null || value === undefined ? "" : JSON.stringify(value, null, 2);
      editor.dispatchEvent(new CustomEvent("json-editor:change", { bubbles: true, detail: value }));
    };
    const render = () => {
      if (!items) return;
      const value = read();
      if (value === undefined) { items.innerHTML = ""; return; }
      if (Array.isArray(value)) {
        items.innerHTML = value.map((item, index) => `<div class="flex gap-xs items-center mt-xs" data-json-index="${index}"><input class="flex-1 border border-outline rounded p-xs" data-json-item value="${String(typeof item === "object" ? JSON.stringify(item) : item ?? "").replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]))}" aria-label="${field} elemento ${index + 1}"><button type="button" class="px-xs text-red-700" data-json-action="remove" aria-label="Eliminar elemento">×</button></div>`).join("");
      } else if (value && typeof value === "object") {
        items.innerHTML = Object.entries(value).map(([key, item]) => `<div class="flex gap-xs items-center mt-xs" data-json-key="${key.replace(/\"/g, "&quot;")}"><input class="w-2/5 border border-outline rounded p-xs" data-json-object-key value="${key.replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]))}" aria-label="${field} clave"><input class="flex-1 border border-outline rounded p-xs" data-json-object-value value="${String(typeof item === "object" ? JSON.stringify(item) : item ?? "").replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]))}" aria-label="${field} valor"><button type="button" class="px-xs text-red-700" data-json-action="remove" aria-label="Eliminar propiedad">×</button></div>`).join("");
      } else items.innerHTML = "<p class=\"text-[11px] text-on-surface-variant\">Sin valor estructurado.</p>";
    };
    const updateFromGuided = () => {
      const current = read();
      if (Array.isArray(current)) {
        write([...editor.querySelectorAll("[data-json-index]")].map((row) => row.querySelector("[data-json-item]")?.value ?? ""));
      } else if (current && typeof current === "object") {
        const next = {};
        editor.querySelectorAll("[data-json-key]").forEach((row) => { const key = row.querySelector("[data-json-object-key]")?.value; if (key) next[key] = row.querySelector("[data-json-object-value]")?.value ?? ""; });
        write(next);
      }
    };
    editor.addEventListener("click", (event) => {
      const action = event.target.closest("[data-json-action]")?.dataset.jsonAction;
      if (!action) return;
      const current = read();
      if (action === "add") write(Array.isArray(current) ? [...current, ""] : { ...(current || {}), nueva_propiedad: "" });
      if (action === "remove") { const row = event.target.closest("[data-json-index], [data-json-key]"); if (Array.isArray(current)) current.splice(Number(row?.dataset.jsonIndex), 1); else delete current[row?.dataset.jsonKey]; write(current); }
      render();
    });
    editor.addEventListener("input", (event) => { if (event.target.matches("[data-json-item], [data-json-object-key], [data-json-object-value]")) updateFromGuided(); });
    // Advanced editing only changes validation feedback. Re-rendering the
    // guided editor here can move focus and destabilize sibling controls in
    // large forms while the user is typing.
    advanced?.addEventListener("input", () => { const checked = parseAdvancedJson(field, advanced.value); if (errorNode) errorNode.textContent = checked.errors[0]?.message || ""; });
    render();
  });
}
