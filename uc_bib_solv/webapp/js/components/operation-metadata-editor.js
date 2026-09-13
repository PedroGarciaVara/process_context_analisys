import { cloneJson, isStructuredEditorDirty, mountStructuredEditors, readStructuredEditor, structuredEditorMarkup } from "./json-editor.js";
import { escapeHtml } from "../core/utils.js";

const formMetadata = new WeakMap();
export const OPERATION_LIST_FIELDS = Object.freeze([
  ["inputs", "Entradas", "Materiales, información o condiciones necesarias"],
  ["outputs", "Salidas", "Resultados materiales o informativos"],
  ["materials", "Materiales", "Materias primas o consumibles"],
  ["parameters", "Parámetros", "Consignas y variables de ejecución"],
  ["quality_controls", "Controles de calidad", "Comprobaciones y criterios"],
  ["indicators", "Indicadores", "Medidas de desempeño"],
  ["open_questions", "Información pendiente", "Preguntas y datos por formalizar"],
]);

function metadataData(metadata) {
  return metadata && typeof metadata.data === "object" && !Array.isArray(metadata.data) ? metadata.data : metadata || {};
}

export function stripLegacyMembershipMetadata(metadata = {}) {
  const result = cloneJson(metadata || {});
  const target = result && typeof result.data === "object" && !Array.isArray(result.data) ? result.data : result;
  ["equipment", "canonical_ids", "operation_machine_assignments"].forEach((key) => delete target[key]);
  if (target !== result) ["equipment", "canonical_ids", "operation_machine_assignments"].forEach((key) => delete result[key]);
  return result;
}

export function operationMetadataMarkup(metadata = {}) {
  const data = metadataData(metadata);
  const family = metadata.family || "general";
  const source = metadata.source?.reference || metadata.source?.system || "Sin procedencia declarada";
  return `<fieldset class="operation-metadata-editor"><legend>Información de negocio</legend><p class="operation-editor-intro">Añade y ordena la información mediante filas. No es necesario escribir JSON.</p><div class="operation-metadata-grid">${OPERATION_LIST_FIELDS.map(([key, label, help]) => `<section class="operation-metadata-section"><div><h3>${escapeHtml(label)}</h3><p>${escapeHtml(help)}</p></div>${structuredEditorMarkup(`operation.${key}`, Array.isArray(data[key]) ? data[key] : [], { kind: "list", label, advanced: false })}</section>`).join("")}</div><details class="operation-metadata-provenance"><summary>Procedencia y trazabilidad</summary><dl><div><dt>Familia</dt><dd>${escapeHtml(family)}</dd></div><div><dt>Fuente</dt><dd>${escapeHtml(source)}</dd></div><div><dt>Versión de esquema</dt><dd>${escapeHtml(metadata.schema_version || "—")}</dd></div></dl><p>Las claves técnicas y extensiones no mostradas se conservan al guardar.</p></details></fieldset>`;
}

export function mountOperationMetadataEditor(form, metadata = {}) {
  formMetadata.set(form, cloneJson(metadata || {}));
  mountStructuredEditors(form);
}

export function readOperationMetadata(form) {
  const metadata = stripLegacyMembershipMetadata(formMetadata.get(form) || {});
  const enveloped = metadata && typeof metadata.data === "object" && !Array.isArray(metadata.data);
  const target = enveloped ? { ...metadata.data } : { ...metadata };
  // Membership is persisted only by the canonical operation-machines command.
  // Historical duplicate keys are never sent back by the generic editor.
  const errors = [];
  OPERATION_LIST_FIELDS.forEach(([key]) => {
    const editor = form.querySelector(`[data-json-editor="operation.${key}"]`);
    const result = readStructuredEditor(editor); errors.push(...result.errors);
    if (Object.prototype.hasOwnProperty.call(target, key) || isStructuredEditorDirty(editor) || result.value.length) target[key] = result.value;
  });
  if (errors.length) throw new Error(errors[0].message);
  return enveloped ? { ...metadata, data: target } : target;
}
