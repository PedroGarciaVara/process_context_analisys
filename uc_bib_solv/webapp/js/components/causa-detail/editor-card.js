import { createElement } from "../../core/utils.js";
import { buildDetailField } from "./shared-fields.js";

export function createEditorCard() {
  const card = createElement("section", { className: "detail-card" });
  card.append(
    createElement("div", { className: "detail-card__header", children: [
      createElement("div", { className: "detail-card__title", text: "Editor de causa" }),
      createElement("div", { className: "detail-card__subtitle", text: "Gestiona altas nuevas o reutilizacion de contratos y causas sin romper el flujo industrial actual." }),
    ] }),
    createElement("div", { className: "detail-card__body", children: [
      createElement("div", { className: "detail-mode-selector", attrs: { id: "cd-editor-mode-wrap" } }),
      createElement("div", { className: "detail-editor-help", attrs: { id: "cd-editor-help" } }),
      createElement("div", { className: "detail-link-actions", attrs: { id: "cd-link-actions" }, children: [
        createElement("div", { attrs: { id: "cd-link-summary" } }),
        createElement("div", { className: "detail-link-actions__footer", children: [
          createElement("button", { className: "btn btn-primary", text: "Buscar nodo existente", attrs: { type: "button", id: "cd-link-search" } }),
          createElement("button", { className: "btn btn-secondary", text: "Limpiar seleccion", attrs: { type: "button", id: "cd-link-clear" } }),
        ] }),
      ] }),
      createElement("div", { className: "detail-editor-fields", attrs: { id: "cd-editor-fields" }, children: [
        buildDetailField("Nombre", createElement("input", { className: "input-control control-input", attrs: { id: "cd-cause-name", type: "text", placeholder: "Nombre de la causa" } }), "name"),
        buildDetailField("Tipo", createElement("select", { className: "input-control control-input", attrs: { id: "cd-cause-type" } }), "type"),
        buildDetailField("Categoria", createElement("input", { className: "input-control control-input", attrs: { id: "cd-cause-category", type: "text", placeholder: "Categoria" } }), "category"),
        buildDetailField("Descripcion", createElement("textarea", { className: "input-control control-textarea", attrs: { id: "cd-cause-description", rows: "5", placeholder: "Descripcion de la causa" } }), "description"),
      ] }),
    ] }),
    createElement("div", { className: "detail-card__footer", children: [
      createElement("button", { className: "btn btn-primary", text: "Guardar causa", attrs: { type: "button", id: "cd-cause-save" } }),
      createElement("button", { className: "btn btn-secondary", text: "Cancelar", attrs: { type: "button", id: "cd-cause-cancel" } }),
      createElement("button", { className: "btn btn-secondary", text: "Salir", attrs: { type: "button", id: "cd-cause-exit" } }),
    ] }),
  );
  return card;
}
