import { createElement } from "../../core/utils.js";
import { buildDetailField } from "./shared-fields.js";

export function createHypothesisCard() {
  const card = createElement("section", { className: "detail-card" });
  card.append(
    createElement("div", { className: "detail-card__header", children: [
      createElement("div", { className: "detail-card__title", text: "Hipotesis" }),
      createElement("div", { className: "detail-card__subtitle", text: "Crea, edita y elimina hipotesis vinculadas a la causa activa." }),
    ] }),
    createElement("div", { className: "detail-card__body", children: [
      createElement("p", { className: "detail-form-hint", text: "Edita únicamente los cuatro datos descriptivos de la hipótesis. Los atributos históricos se conservan al guardar." }),
      buildDetailField("Título hipótesis", createElement("input", { className: "input-control control-input", attrs: { id: "cd-hypothesis-title", name: "hypothesis_title", type: "text", placeholder: "Título de la hipótesis", autocomplete: "off" } })),
      buildDetailField("Descripción", createElement("textarea", { className: "input-control control-textarea", attrs: { id: "cd-hypothesis-description", name: "hypothesis_description", rows: "4", placeholder: "Describe qué causa esperas que explique el problema…", autocomplete: "off" } })),
      buildDetailField("Criterio de validación", createElement("textarea", { className: "input-control control-textarea", attrs: { id: "cd-hypothesis-criterion", name: "hypothesis_criterion", rows: "3", placeholder: "Qué resultado confirma o rechaza la hipótesis…", autocomplete: "off" } })),
      buildDetailField("Método de cálculo", createElement("textarea", { className: "input-control control-textarea", attrs: { id: "cd-hypothesis-method", name: "metodo", rows: "3", placeholder: "Describe el método utilizado para calcular o validar…", autocomplete: "off" } })),
    ] }),
    createElement("div", { className: "detail-card__footer", children: [
      createElement("button", { className: "btn btn-primary", text: "Guardar hipotesis", attrs: { type: "button", id: "cd-hypothesis-save" } }),
      createElement("p", { className: "detail-inline-feedback detail-inline-feedback--success", text: "", attrs: { id: "cd-hypothesis-creation-feedback", role: "status", "aria-live": "polite", hidden: "true" } }),
      createElement("button", { className: "btn btn-secondary", text: "Nueva hipotesis", attrs: { type: "button", id: "cd-hypothesis-new" } }),
    ] }),
    createElement("div", { className: "detail-hypothesis-section", children: [
      createElement("div", { className: "detail-hypothesis-section__header", text: "Hipotesis existentes" }),
      createElement("div", { className: "detail-hypothesis-section__list", attrs: { id: "cd-hypothesis-list" } }),
    ] }),
  );
  return card;
}
