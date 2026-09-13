const TITLE_KEYS = ["name", "nombre", "title", "titulo", "label"];
const DESCRIPTION_KEYS = ["description", "descripcion", "detail", "detalle"];

export const cloneStructured = (value) => value === undefined
  ? undefined
  : JSON.parse(JSON.stringify(value));

let rowSequence = 0;
const rowId = () => `structured-row-${Date.now().toString(36)}-${++rowSequence}`;
const ownKey = (value, candidates) => candidates.find((key) => Object.prototype.hasOwnProperty.call(value || {}, key));
const scalar = (value) => value === null || ["string", "number", "boolean"].includes(typeof value);

function displayValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (scalar(value)) return String(value);
  return Array.isArray(value) ? `${value.length} elementos` : `${Object.keys(value).length} propiedades`;
}

function listRow(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const titleKey = ownKey(value, TITLE_KEYS);
    const descriptionKey = ownKey(value, DESCRIPTION_KEYS);
    const known = new Set([titleKey, descriptionKey].filter(Boolean));
    return {
      id: rowId(), sourceKind: "object", original: cloneStructured(value),
      titleKey: titleKey || "name", descriptionKey: descriptionKey || "description",
      title: displayValue(titleKey ? value[titleKey] : ""),
      description: displayValue(descriptionKey ? value[descriptionKey] : ""),
      extraKeys: Object.keys(value).filter((key) => !known.has(key)),
      complex: false,
    };
  }
  return {
    id: rowId(), sourceKind: "scalar", original: cloneStructured(value),
    title: displayValue(value), description: "", extraKeys: [], complex: false,
  };
}

function objectRow([key, value]) {
  return {
    id: rowId(), sourceKind: "property", originalKey: key,
    original: cloneStructured(value), title: key, description: displayValue(value),
    extraKeys: [], complex: !scalar(value),
  };
}

export function createStructuredDraft(field, value, { kind = "advanced", nullable = true } = {}) {
  const original = cloneStructured(value);
  const sourceShape = Array.isArray(value) ? "list" : value && typeof value === "object" ? "object" : null;
  let shape = sourceShape;
  if (!shape) shape = kind === "object" ? "object" : "list";
  return {
    field, kind, nullable, original, sourceShape, shape, dirty: false,
    rows: shape === "list" ? (Array.isArray(value) ? value : []).map(listRow)
      : (value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : []).map(objectRow),
  };
}

export function addStructuredRow(draft) {
  const row = draft.shape === "object"
    ? objectRow(["nueva_propiedad", ""])
    : listRow({ name: "", description: "" });
  return { draft: { ...draft, dirty: true, rows: [...draft.rows, row] }, rowId: row.id };
}

export function updateStructuredRow(draft, id, changes) {
  return { ...draft, dirty: true, rows: draft.rows.map((row) => row.id === id ? { ...row, ...changes } : row) };
}

export function removeStructuredRow(draft, id) {
  return { ...draft, dirty: true, rows: draft.rows.filter((row) => row.id !== id) };
}

export function moveStructuredRow(draft, id, direction) {
  const index = draft.rows.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= draft.rows.length) return draft;
  const rows = [...draft.rows];
  [rows[index], rows[target]] = [rows[target], rows[index]];
  return { ...draft, dirty: true, rows };
}

function restoreScalarType(original, text) {
  if (typeof original === "number" && text.trim() !== "" && Number.isFinite(Number(text))) return Number(text);
  if (typeof original === "boolean" && /^(true|false)$/i.test(text.trim())) return text.trim().toLowerCase() === "true";
  if (original === null && text.trim() === "") return null;
  return text;
}

export function serializeStructuredDraft(draft) {
  const errors = [];
  if (draft.shape === "object") {
    const result = {};
    draft.rows.forEach((row, index) => {
      const key = String(row.title || "").trim();
      if (!key) errors.push({ code: "required_title", rowId: row.id, message: `La propiedad ${index + 1} necesita un título.` });
      else if (Object.prototype.hasOwnProperty.call(result, key)) errors.push({ code: "duplicate_key", rowId: row.id, message: `La propiedad ${key} está repetida.` });
      else result[key] = row.complex ? cloneStructured(row.original) : restoreScalarType(row.original, row.description);
    });
    return { value: result, errors };
  }
  const value = draft.rows.map((row, index) => {
    const title = String(row.title || "").trim();
    const description = String(row.description || "").trim();
    if (!title) errors.push({ code: "required_title", rowId: row.id, message: `El elemento ${index + 1} necesita un título.` });
    if (row.sourceKind === "scalar" && !description) return restoreScalarType(row.original, title);
    const item = row.sourceKind === "object" ? cloneStructured(row.original) : {};
    item[row.titleKey || "name"] = title;
    if (description || Object.prototype.hasOwnProperty.call(item, row.descriptionKey || "description")) item[row.descriptionKey || "description"] = description;
    return item;
  });
  return { value, errors };
}

export function replaceStructuredValue(draft, value) {
  return createStructuredDraft(draft.field, value, { kind: draft.kind, nullable: draft.nullable });
}
