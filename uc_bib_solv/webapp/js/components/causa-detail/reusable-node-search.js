import { createElement } from "../../core/utils.js";
import { buildDetailField } from "./shared-fields.js";

export function createReusableNodeSearch() {
  return createElement("div", { className: "modal-overlay", attrs: { "data-modal-kind": "search", "aria-hidden": "true", role: "dialog", "aria-modal": "true" }, children: [
    createElement("section", { className: "modal-card detail-search-modal", attrs: { tabindex: "-1" }, children: [
      createElement("div", { className: "modal-card__accent" }),
      createElement("div", { className: "modal-card__header", children: [
        createElement("p", { className: "detail-kicker", text: "Busqueda corporativa" }),
        createElement("h3", { className: "modal-card__title", text: "Selecciona un nodo reutilizable", attrs: { id: "cd-search-title" } }),
        createElement("p", { className: "detail-modal-note", text: "Filtra por nombre, codigo, descripcion, proceso o metadata relevante.", attrs: { id: "cd-search-subtitle" } }),
      ] }),
      createElement("div", { className: "modal-card__body", children: [
        buildDetailField("Texto libre", createElement("input", { className: "input-control control-input", attrs: { id: "cd-search-text", type: "text", placeholder: "Descripcion, proceso, contrato, codigo..." } }), "search"),
        createElement("div", { className: "detail-search-toolbar", children: [
          createElement("button", { className: "btn btn-primary", text: "Buscar", attrs: { type: "button", id: "cd-search-run" } }),
          createElement("span", { className: "detail-modal-note", text: "0 resultados", attrs: { id: "cd-search-status" } }),
        ] }),
        createElement("div", { className: "detail-search-results-wrap", attrs: { id: "cd-search-results" } }),
      ] }),
      createElement("div", { className: "modal-card__footer", children: [
        createElement("button", { className: "btn btn-secondary", text: "Cancelar", attrs: { type: "button", id: "cd-search-close" } }),
      ] }),
    ] }),
  ] });
}
